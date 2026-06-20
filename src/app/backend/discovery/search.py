# discovery/search.py -- Brave Search client for broad resource discovery.

from __future__ import annotations

import os
from dataclasses import dataclass

import httpx

BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"


@dataclass(frozen=True)
class SearchResult:
    query: str
    title: str
    url: str
    description: str


def brave_search_configured() -> bool:
    return bool(os.environ.get("BRAVE_SEARCH_API_KEY"))


async def search_web(query: str, *, count: int = 5) -> list[SearchResult]:
    api_key = os.environ.get("BRAVE_SEARCH_API_KEY")
    if not api_key:
        return []

    params = {
        "q": query,
        "count": max(1, min(count, 10)),
        "country": "us",
        "search_lang": "en",
        "safesearch": "moderate",
    }
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": api_key,
    }

    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        response = await client.get(BRAVE_SEARCH_URL, params=params, headers=headers)
    response.raise_for_status()
    payload = response.json()

    results = payload.get("web", {}).get("results", [])
    out: list[SearchResult] = []
    for item in results:
        title = str(item.get("title") or "").strip()
        url = str(item.get("url") or "").strip()
        description = str(item.get("description") or "").strip()
        if title and url:
            out.append(SearchResult(query=query, title=title, url=url, description=description))
    return out
