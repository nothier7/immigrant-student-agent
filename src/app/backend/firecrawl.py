# firecrawl.py — cache-aware wrapper around Firecrawl SDK/HTTP with PDF-safety + shorter timeouts
import os
import time
import json
import hashlib
import threading
from typing import Optional, List, Dict, Any

try:
    from firecrawl import FirecrawlApp, ScrapeOptions  # type: ignore
except Exception:
    FirecrawlApp = None
    ScrapeOptions = None

try:
    import requests  # type: ignore
except Exception:
    requests = None  # type: ignore

def _now() -> float: return time.time()
def _sha1(s: str) -> str: return hashlib.sha1(s.encode("utf-8")).hexdigest()
def _looks_like_pdf_url(url: str) -> bool: return url.lower().endswith(".pdf")

def _is_pdf_via_head(url: str, timeout: int = 5) -> bool:
    if _looks_like_pdf_url(url): return True
    if not requests: return False
    try:
        r = requests.head(url, allow_redirects=True, timeout=timeout)
        return "application/pdf" in r.headers.get("content-type", "").lower()
    except Exception:
        return False

class FirecrawlService:
    """
    - scrape(url): TTL 24h   (FIRECRAWL_SCRAPE_TTL)
    - search(q):   TTL 6h    (FIRECRAWL_SEARCH_TTL)
    - disk cache dir: FIRECRAWL_CACHE_DIR
    - cooldown on 429: FIRECRAWL_COOLDOWN (s)
    - PDF policy: FIRECRAWL_PDF_POLICY = skip | minimal | full
    - network timeouts: FIRECRAWL_TIMEOUT_S (read), FIRECRAWL_CONNECT_TIMEOUT_S
    - max md chars: FIRECRAWL_MAX_MD_CHARS
    """
    def __init__(self):
        self.api_key = os.getenv("FIRECRAWL_API_KEY", "").strip()
        self._mode = "sdk" if (FirecrawlApp and self.api_key) else "http"

        self.scrape_ttl = int(os.getenv("FIRECRAWL_SCRAPE_TTL", "86400"))
        self.search_ttl = int(os.getenv("FIRECRAWL_SEARCH_TTL", "21600"))
        self.cooldown_s = int(os.getenv("FIRECRAWL_COOLDOWN", "45"))

        self.pdf_policy = os.getenv("FIRECRAWL_PDF_POLICY", "minimal").lower()
        self.pdf_head_timeout = int(os.getenv("FIRECRAWL_PDF_HEAD_TIMEOUT", "5"))

        self.read_timeout = int(os.getenv("FIRECRAWL_TIMEOUT_S", "15"))
        self.conn_timeout = int(os.getenv("FIRECRAWL_CONNECT_TIMEOUT_S", "5"))
        self.max_md_chars = int(os.getenv("FIRECRAWL_MAX_MD_CHARS", "8000"))

        self._scrape_cache: dict[str, tuple[float, Optional[str]]] = {}
        self._search_cache: dict[str, tuple[float, List[Dict[str, Any]]]] = {}

        self.cache_dir = os.getenv("FIRECRAWL_CACHE_DIR", "").strip()
        if self.cache_dir:
            os.makedirs(os.path.join(self.cache_dir, "scrape"), exist_ok=True)
            os.makedirs(os.path.join(self.cache_dir, "search"), exist_ok=True)

        self._cooldown_until = 0.0
        self._locks: dict[str, threading.Lock] = {}

        self._base = os.getenv("FIRECRAWL_BASE_URL", "https://api.firecrawl.dev/v1")
        self._requests = requests
        if self._mode == "sdk":
            self.app = FirecrawlApp(api_key=self.api_key)  # type: ignore
        else:
            if not self._requests:
                raise RuntimeError("HTTP mode requires 'requests'. Add requests>=2.32.3 and uv sync.")

    # --- cooldown ---
    def _cooling(self) -> bool: return _now() < self._cooldown_until
    def _trip_cooldown(self): self._cooldown_until = _now() + self.cooldown_s

    # --- cache helpers ---
    def _lock_for(self, key: str) -> threading.Lock:
        if key not in self._locks: self._locks[key] = threading.Lock()
        return self._locks[key]
    def _scrape_key(self, url: str) -> str: return _sha1(url.strip())
    def _search_key(self, q: str, limit: int) -> str: return _sha1(f"{' '.join(q.lower().split())}|{limit}")

    def _disk_read(self, kind: str, key: str):
        if not self.cache_dir: return None
        path = os.path.join(self.cache_dir, kind, f"{key}.json")
        try:
            with open(path, "r", encoding="utf-8") as f:
                obj = json.load(f)
            if obj.get("expires", 0) > _now(): return obj.get("payload", None)
            try: os.remove(path)
            except Exception: pass
        except FileNotFoundError:
            return None
        except Exception as e:
            print(f"[firecrawl] disk_read {kind} err: {type(e).__name__}: {e}")
        return None

    def _disk_write(self, kind: str, key: str, expires: float, payload):
        if not self.cache_dir: return
        path = os.path.join(self.cache_dir, kind, f"{key}.json")
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump({"expires": expires, "payload": payload}, f)
        except Exception as e:
            print(f"[firecrawl] disk_write {kind} err: {type(e).__name__}: {e}")

    # --- public ---
    def is_rate_limited(self) -> bool: return self._cooling()

    def search(self, query: str, limit: int = 6, force: bool = False, include_pdfs: bool = False) -> List[Dict[str, Any]]:
        key = self._search_key(f"{query}|pdfs:{include_pdfs}", limit)

        if not force:
            hit = self._search_cache.get(key)
            if hit and hit[0] > _now(): return hit[1]
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
                if hit and hit[0] > _now(): return hit[1]

            try:
                if self._mode == "sdk":
                    res = self.app.search(query=query, limit=limit,
                        scrape_options=ScrapeOptions(formats=["markdown"]) if ScrapeOptions else None)  # type: ignore
                    data = getattr(res, "data", []) or []
                else:
                    # 2 quick retries on transient errors
                    attempts = 0
                    data = []
                    while attempts < 3:
                        attempts += 1
                        r = self._requests.post(
                            f"{self._base}/search",
                            headers={"Authorization": f"Bearer {self.api_key}"},
                            json={"query": query, "limit": limit, "scrapeOptions": {"formats": ["markdown"]}},
                            timeout=(self.conn_timeout, self.read_timeout),
                        )
                        if r.status_code == 429:
                            self._trip_cooldown()
                            hit = self._search_cache.get(key)
                            return hit[1] if hit else (self._disk_read("search", key) or [])
                        if r.status_code in (408, 500, 502, 503, 504, 522, 524):
                            time.sleep(0.6 * attempts)
                            continue
                        r.raise_for_status()
                        data = (r.json() or {}).get("data", []) or []
                        break

                out: List[Dict[str, Any]] = []
                for item in data:
                    url = item.get("url")
                    if not url: continue
                    if not include_pdfs and _looks_like_pdf_url(url): continue
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
        key = self._scrape_key(url)

        if not force:
            hit = self._scrape_cache.get(key)
            if hit and hit[0] > _now(): return hit[1]
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
                if hit and hit[0] > _now(): return hit[1]

            try:
                is_pdf = _looks_like_pdf_url(url) or _is_pdf_via_head(url, timeout=self.pdf_head_timeout)

                if is_pdf:
                    if self.pdf_policy == "skip":
                        md = f"[PDF skipped by policy] {url}\n"
                        expires = _now() + self.scrape_ttl
                        self._scrape_cache[key] = (expires, md); self._disk_write("scrape", key, expires, md)
                        return md
                    if self.pdf_policy == "minimal":
                        if not self._requests:
                            md = f"[PDF skipped (no HTTP client)] {url}\n"
                            expires = _now() + self.scrape_ttl
                            self._scrape_cache[key] = (expires, md); self._disk_write("scrape", key, expires, md)
                            return md
                        attempts = 0
                        while attempts < 3:
                            attempts += 1
                            r = self._requests.post(
                                f"{self._base}/scrape",
                                headers={"Authorization": f"Bearer {self.api_key}"},
                                json={"url": url, "parsers": []},
                                timeout=(self.conn_timeout, self.read_timeout),
                            )
                            if r.status_code == 429:
                                self._trip_cooldown()
                                hit = self._scrape_cache.get(key)
                                return hit[1] if hit else (self._disk_read("scrape", key) or None)
                            if r.status_code in (408, 500, 502, 503, 504, 522, 524):
                                time.sleep(0.6 * attempts)
                                continue
                            r.raise_for_status()
                            break
                        md = f"[PDF fetched (base64, not parsed)] {url}\n"
                        expires = _now() + self.scrape_ttl
                        self._scrape_cache[key] = (expires, md); self._disk_write("scrape", key, expires, md)
                        return md
                    # else: "full" → fall through

                if self._mode == "sdk" and not is_pdf:
                    r = self.app.scrape_url(url, formats=["markdown"])  # type: ignore[attr-defined]
                    md = getattr(r, "markdown", None)
                else:
                    attempts = 0
                    md = None
                    while attempts < 3:
                        attempts += 1
                        r = self._requests.post(
                            f"{self._base}/scrape",
                            headers={"Authorization": f"Bearer {self.api_key}"},
                            json={"url": url, "formats": ["markdown"]},
                            timeout=(self.conn_timeout, self.read_timeout),
                        )
                        if r.status_code == 429:
                            self._trip_cooldown()
                            hit = self._scrape_cache.get(key)
                            return hit[1] if hit else (self._disk_read("scrape", key) or None)
                        if r.status_code in (408, 500, 502, 503, 504, 522, 524):
                            time.sleep(0.6 * attempts)
                            continue
                        r.raise_for_status()
                        md = (r.json() or {}).get("markdown")
                        break

                if md:
                    if len(md) > self.max_md_chars:
                        md = md[: self.max_md_chars]
                    expires = _now() + self.scrape_ttl
                    self._scrape_cache[key] = (expires, md)
                    self._disk_write("scrape", key, expires, md)
                return md

            except Exception as e:
                print(f"[firecrawl] scrape failed for {url}: {type(e).__name__}: {e}")
                hit = self._scrape_cache.get(key)
                return hit[1] if hit else (self._disk_read("scrape", key) or None)

    def warm_cache(self, urls: List[str]):
        for u in urls:
            try: self.scrape(u)
            except Exception: pass
