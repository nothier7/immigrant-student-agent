# firecrawl.py — cache-aware wrapper around Firecrawl SDK/HTTP with PDF-safety
import os
import time
import json
import hashlib
import threading
from typing import Optional, List, Dict, Any

# Prefer SDK if available
try:
    from firecrawl import FirecrawlApp, ScrapeOptions  # type: ignore
except Exception:
    FirecrawlApp = None
    ScrapeOptions = None

# Try requests globally so we can fall back even in SDK mode
try:
    import requests  # type: ignore
except Exception:  # pragma: no cover
    requests = None  # type: ignore


def _now() -> float:
    return time.time()


def _sha1(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()


def _looks_like_pdf_url(url: str) -> bool:
    return url.lower().endswith(".pdf")


def _is_pdf_via_head(url: str, timeout: int = 5) -> bool:
    """Best-effort check using HEAD. Falls back to extension if HEAD fails or requests missing."""
    if _looks_like_pdf_url(url):
        return True
    if not requests:
        return False
    try:
        r = requests.head(url, allow_redirects=True, timeout=timeout)
        ct = r.headers.get("content-type", "").lower()
        return "application/pdf" in ct
    except Exception:
        return False


class FirecrawlService:
    """
    Caching rules:
      - scrape(url): TTL 24h by default (FIRECRAWL_SCRAPE_TTL)
      - search(query, limit): TTL 6h by default (FIRECRAWL_SEARCH_TTL)
    Optional disk cache (set FIRECRAWL_CACHE_DIR):
      <dir>/scrape/<sha1>.json -> {"expires": ts, "payload": "<markdown or stub or null>"}
      <dir>/search/<sha1>.json -> {"expires": ts, "payload": [{"url":..., "title":...}, ...]}
    Rate limit:
      - on 429, trip cooldown (FIRECRAWL_COOLDOWN, default 45s) and return cached data if present.

    PDF credit safety (defaults to "minimal"):
      - FIRECRAWL_PDF_POLICY = "skip" | "minimal" | "full"
        * skip: do not scrape PDFs (return a stub; keep link as a source)
        * minimal: call /scrape with {"parsers": []} (flat 1 credit, base64 file, not parsed)
        * full: parse as normal (may consume 1 credit per PDF *page*)
      - FIRECRAWL_PDF_HEAD_TIMEOUT: HEAD timeout for PDF detection (seconds)
    """

    def __init__(self):
        self.api_key = os.getenv("FIRECRAWL_API_KEY", "").strip()
        self._mode = "sdk" if (FirecrawlApp and self.api_key) else "http"

        # TTLs and cooldown (seconds)
        self.scrape_ttl = int(os.getenv("FIRECRAWL_SCRAPE_TTL", "86400"))   # 24h
        self.search_ttl = int(os.getenv("FIRECRAWL_SEARCH_TTL", "21600"))   # 6h
        self.cooldown_s = int(os.getenv("FIRECRAWL_COOLDOWN", "45"))

        # PDF policy
        self.pdf_policy = os.getenv("FIRECRAWL_PDF_POLICY", "minimal").lower()  # "skip" | "minimal" | "full"
        self.pdf_head_timeout = int(os.getenv("FIRECRAWL_PDF_HEAD_TIMEOUT", "5"))

        # In-memory caches: key -> (expires_at, payload)
        self._scrape_cache: dict[str, tuple[float, Optional[str]]] = {}
        self._search_cache: dict[str, tuple[float, List[Dict[str, Any]]]] = {}

        # Optional disk cache
        self.cache_dir = os.getenv("FIRECRAWL_CACHE_DIR", "").strip()
        if self.cache_dir:
            os.makedirs(os.path.join(self.cache_dir, "scrape"), exist_ok=True)
            os.makedirs(os.path.join(self.cache_dir, "search"), exist_ok=True)

        # Rate-limit state
        self._cooldown_until = 0.0

        # Concurrency guard to avoid duplicate work on the same key
        self._locks: dict[str, threading.Lock] = {}

        # HTTP base/requests for HTTP mode or SDK fallbacks
        self._base = os.getenv("FIRECRAWL_BASE_URL", "https://api.firecrawl.dev/v1")
        self._requests = requests

        if self._mode == "sdk":
            self.app = FirecrawlApp(api_key=self.api_key)  # type: ignore
        else:
            if not self._requests:
                raise RuntimeError(
                    "HTTP mode requires 'requests'. Add `requests>=2.32.3` to backend/pyproject.toml and run `uv sync`."
                )

    # --------------- cooldown helpers ---------------
    def _cooling(self) -> bool:
        return _now() < self._cooldown_until

    def _trip_cooldown(self):
        self._cooldown_until = _now() + self.cooldown_s

    # --------------- cache helpers ---------------
    def _lock_for(self, key: str) -> threading.Lock:
        if key not in self._locks:
            self._locks[key] = threading.Lock()
        return self._locks[key]

    def _scrape_key(self, url: str) -> str:
        return _sha1(url.strip())

    def _search_key(self, query: str, limit: int) -> str:
        qn = " ".join(query.lower().split())
        return _sha1(f"{qn}|{limit}")

    def _disk_read(self, kind: str, key: str):
        if not self.cache_dir:
            return None
        path = os.path.join(self.cache_dir, kind, f"{key}.json")
        try:
            with open(path, "r", encoding="utf-8") as f:
                obj = json.load(f)
            if obj.get("expires", 0) > _now():
                return obj.get("payload", None)
            try:
                os.remove(path)
            except Exception:
                pass
        except FileNotFoundError:
            return None
        except Exception as e:
            print(f"[firecrawl] disk_read {kind} err: {type(e).__name__}: {e}")
        return None

    def _disk_write(self, kind: str, key: str, expires: float, payload):
        if not self.cache_dir:
            return
        path = os.path.join(self.cache_dir, kind, f"{key}.json")
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump({"expires": expires, "payload": payload}, f)
        except Exception as e:
            print(f"[firecrawl] disk_write {kind} err: {type(e).__name__}: {e}")

    # --------------- public API ---------------
    def is_rate_limited(self) -> bool:
        return self._cooling()

    def search(
        self,
        query: str,
        limit: int = 6,
        force: bool = False,
        include_pdfs: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Returns: [{"url": "...", "title": "..."}]
        - By default, PDF URLs are filtered out from search results (set include_pdfs=True to keep them).
        """
        key = self._search_key(f"{query}|pdfs:{include_pdfs}", limit)

        if not force:
            hit = self._search_cache.get(key)
            if hit and hit[0] > _now():
                return hit[1]
            disk = self._disk_read("search", key)
            if disk is not None:
                self._search_cache[key] = (_now() + self.search_ttl, disk)
                return disk

        if self._cooling():
            hit = self._search_cache.get(key)
            return hit[1] if hit else (self._disk_read("search", key) or [])

        lock = self._lock_for(f"search:{key}")
        with lock:
            if not force:
                hit = self._search_cache.get(key)
                if hit and hit[0] > _now():
                    return hit[1]

            try:
                if self._mode == "sdk":
                    # SDK search
                    res = self.app.search(  # type: ignore[attr-defined]
                        query=query,
                        limit=limit,
                        scrape_options=ScrapeOptions(formats=["markdown"]) if ScrapeOptions else None,
                    )
                    data = getattr(res, "data", []) or []
                else:
                    # HTTP search
                    r = self._requests.post(
                        f"{self._base}/search",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        json={"query": query, "limit": limit, "scrapeOptions": {"formats": ["markdown"]}},
                        timeout=30,
                    )
                    if r.status_code == 429:
                        self._trip_cooldown()
                        hit = self._search_cache.get(key)
                        return hit[1] if hit else (self._disk_read("search", key) or [])
                    r.raise_for_status()
                    data = (r.json() or {}).get("data", []) or []

                out: List[Dict[str, Any]] = []
                for item in data:
                    url = item.get("url")
                    if not url:
                        continue
                    if not include_pdfs and _looks_like_pdf_url(url):
                        continue
                    out.append({"url": url, "title": item.get("title")})

                expires = _now() + self.search_ttl
                self._search_cache[key] = (expires, out)
                self._disk_write("search", key, expires, out)
                return out

            except Exception as e:
                print(f"[firecrawl] search failed: {type(e).__name__}: {e}")
                hit = self._search_cache.get(key)
                return hit[1] if hit else (self._disk_read("search", key) or [])

    def scrape(self, url: str, force: bool = False) -> Optional[str]:
        """
        Returns: markdown string or a stub (for skipped/minimal PDFs), or None on hard failure.
        PDF handling:
          - skip: store '[PDF skipped by policy] <url>'
          - minimal: call /scrape with {"parsers": []}, store '[PDF fetched (base64, not parsed)] <url>'
          - full: parse normally (may cost 1 credit per PDF page)
        """
        key = self._scrape_key(url)

        if not force:
            hit = self._scrape_cache.get(key)
            if hit and hit[0] > _now():
                return hit[1]
            disk = self._disk_read("scrape", key)
            if disk is not None:
                self._scrape_cache[key] = (_now() + self.scrape_ttl, disk)
                return disk

        if self._cooling():
            hit = self._scrape_cache.get(key)
            return hit[1] if hit else (self._disk_read("scrape", key) or None)

        lock = self._lock_for(f"scrape:{key}")
        with lock:
            if not force:
                hit = self._scrape_cache.get(key)
                if hit and hit[0] > _now():
                    return hit[1]

            try:
                is_pdf = _looks_like_pdf_url(url) or _is_pdf_via_head(url, timeout=self.pdf_head_timeout)

                # Handle PDFs according to policy BEFORE making an expensive call
                if is_pdf:
                    if self.pdf_policy == "skip":
                        md = f"[PDF skipped by policy] {url}\n"
                        expires = _now() + self.scrape_ttl
                        self._scrape_cache[key] = (expires, md)
                        self._disk_write("scrape", key, expires, md)
                        return md

                    if self.pdf_policy == "minimal":
                        if not self._requests:
                            # Cannot do HTTP fallback → safest is to skip
                            md = f"[PDF skipped (no HTTP client available)] {url}\n"
                            expires = _now() + self.scrape_ttl
                            self._scrape_cache[key] = (expires, md)
                            self._disk_write("scrape", key, expires, md)
                            return md

                        # Flat 1 credit using parsers: []
                        r = self._requests.post(
                            f"{self._base}/scrape",
                            headers={"Authorization": f"Bearer {self.api_key}"},
                            json={"url": url, "parsers": []},
                            timeout=60,
                        )
                        if r.status_code == 429:
                            self._trip_cooldown()
                            hit = self._scrape_cache.get(key)
                            return hit[1] if hit else (self._disk_read("scrape", key) or None)
                        r.raise_for_status()
                        # We do not parse base64 here; keep a stub so UI can still show the source
                        md = f"[PDF fetched (base64, not parsed)] {url}\n"
                        expires = _now() + self.scrape_ttl
                        self._scrape_cache[key] = (expires, md)
                        self._disk_write("scrape", key, expires, md)
                        return md
                    # else: "full" → fall through to normal parsing

                # Normal path (non-PDF or full policy)
                if self._mode == "sdk" and not is_pdf:
                    r = self.app.scrape_url(url, formats=["markdown"])  # type: ignore[attr-defined]
                    md = getattr(r, "markdown", None)
                else:
                    # HTTP path (also used for SDK+full PDFs)
                    payload: Dict[str, Any] = {"url": url, "formats": ["markdown"]}
                    r = self._requests.post(
                        f"{self._base}/scrape",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        json=payload,
                        timeout=60,
                    )
                    if r.status_code == 429:
                        self._trip_cooldown()
                        hit = self._scrape_cache.get(key)
                        return hit[1] if hit else (self._disk_read("scrape", key) or None)
                    r.raise_for_status()
                    md = (r.json() or {}).get("markdown")

                if md:
                    expires = _now() + self.scrape_ttl
                    self._scrape_cache[key] = (expires, md)
                    self._disk_write("scrape", key, expires, md)
                return md

            except Exception as e:
                # Avoid non-ASCII symbols in logs (Windows console safe)
                print(f"[firecrawl] scrape failed for {url}: {type(e).__name__}: {e}")
                hit = self._scrape_cache.get(key)
                return hit[1] if hit else (self._disk_read("scrape", key) or None)

    # Convenience: warm cache for known URLs on startup
    def warm_cache(self, urls: List[str]):
        for u in urls:
            try:
                self.scrape(u)
            except Exception:
                pass
