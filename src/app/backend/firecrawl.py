# firecrawl.py — cache-aware wrapper around Firecrawl SDK/HTTP
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


def _now() -> float:
    return time.time()


def _sha1(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()


class FirecrawlService:
    """
    Caching rules:
      - scrape(url): TTL 24h by default (FIRECRAWL_SCRAPE_TTL)
      - search(query, limit): TTL 6h by default (FIRECRAWL_SEARCH_TTL)
    Optional disk cache:
      - set FIRECRAWL_CACHE_DIR to persist entries across restarts.
        Files saved under:
          <dir>/scrape/<sha1>.json  -> {"expires": ts, "payload": "<markdown or null>"}
          <dir>/search/<sha1>.json  -> {"expires": ts, "payload": [{"url":..., "title":...}, ...]}
    Rate limit:
      - on 429, trip cooldown (FIRECRAWL_COOLDOWN, default 45s) and return cached data if present.
    """

    def __init__(self):
        self.api_key = os.getenv("FIRECRAWL_API_KEY", "")
        self._mode = "sdk" if (FirecrawlApp and self.api_key) else "http"

        # TTLs and cooldown (seconds)
        self.scrape_ttl = int(os.getenv("FIRECRAWL_SCRAPE_TTL", "86400"))   # 24h
        self.search_ttl = int(os.getenv("FIRECRAWL_SEARCH_TTL", "21600"))   # 6h
        self.cooldown_s = int(os.getenv("FIRECRAWL_COOLDOWN", "45"))

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

        if self._mode == "sdk":
            self.app = FirecrawlApp(api_key=self.api_key)
            self._requests = None
            self._base = None
        else:
            try:
                import requests  # type: ignore
            except ModuleNotFoundError as e:
                raise RuntimeError(
                    "HTTP mode requires 'requests'. Add `requests>=2.32.3` to backend/pyproject.toml and run `uv sync`."
                ) from e
            self._requests = requests
            self._base = os.getenv("FIRECRAWL_BASE_URL", "https://api.firecrawl.dev/v1")

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
            # expired: best-effort delete
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

    def search(self, query: str, limit: int = 6, force: bool = False) -> List[Dict[str, Any]]:
        """
        Returns: [{"url": "...", "title": "..."}]
        """
        key = self._search_key(query, limit)

        if not force:
            # memory cache
            hit = self._search_cache.get(key)
            if hit and hit[0] > _now():
                return hit[1]
            # disk cache
            disk = self._disk_read("search", key)
            if disk is not None:
                # rehydrate into memory
                self._search_cache[key] = (_now() + self.search_ttl, disk)
                return disk

        if self._cooling():
            # On cooldown, return stale disk/mem if exist, else empty
            hit = self._search_cache.get(key)
            return hit[1] if hit else (self._disk_read("search", key) or [])

        lock = self._lock_for(f"search:{key}")
        with lock:
            # recheck after waiting for lock
            if not force:
                hit = self._search_cache.get(key)
                if hit and hit[0] > _now():
                    return hit[1]

            try:
                if self._mode == "sdk":
                    res = self.app.search(
                        query=query,
                        limit=limit,
                        scrape_options=ScrapeOptions(formats=["markdown"]) if ScrapeOptions else None,
                    )
                    data = getattr(res, "data", []) or []
                else:
                    r = self._requests.post(
                        f"{self._base}/search",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        json={"query": query, "limit": limit, "scrapeOptions": {"formats": ["markdown"]}},
                        timeout=30,
                    )
                    if r.status_code == 429:
                        self._trip_cooldown()
                        # serve cached if available
                        hit = self._search_cache.get(key)
                        return hit[1] if hit else (self._disk_read("search", key) or [])
                    r.raise_for_status()
                    data = (r.json() or {}).get("data", []) or []

                out: List[Dict[str, Any]] = []
                for item in data:
                    url = item.get("url")
                    if url:
                        out.append({"url": url, "title": item.get("title")})

                expires = _now() + self.search_ttl
                self._search_cache[key] = (expires, out)
                self._disk_write("search", key, expires, out)
                return out

            except Exception as e:
                print(f"[firecrawl] search failed: {type(e).__name__}: {e}")
                # on error, prefer stale cache over empty
                hit = self._search_cache.get(key)
                return hit[1] if hit else (self._disk_read("search", key) or [])

    def scrape(self, url: str, force: bool = False) -> Optional[str]:
        """
        Returns: markdown string or None
        """
        key = self._scrape_key(url)

        if not force:
            # memory cache
            hit = self._scrape_cache.get(key)
            if hit and hit[0] > _now():
                return hit[1]
            # disk cache
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
                if self._mode == "sdk":
                    r = self.app.scrape_url(url, formats=["markdown"])
                    md = getattr(r, "markdown", None)
                else:
                    r = self._requests.post(
                        f"{self._base}/scrape",
                        headers={"Authorization": f"Bearer {self.api_key}"},
                        json={"url": url, "formats": ["markdown"]},
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
