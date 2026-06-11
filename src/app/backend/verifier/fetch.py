# verifier/fetch.py — fetch_text downloads the page, strips noisy tags, and
# returns readable text. locate keeps only lines near deadline/eligibility
# keywords (the "narrow the input" step).
# Later upgrades: Firecrawl for JS-heavy pages, semantic locate via embeddings.

from __future__ import annotations

import httpx
from bs4 import BeautifulSoup

KEYWORDS = (
    "deadline", "due", "apply", "application", "eligib",
    "open", "close", "award", "semester", "cycle",
)


async def fetch_text(url: str) -> str:
    async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
        resp = await client.get(url)
    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        tag.decompose()
    return soup.get_text(" ", strip=True)


def locate(text: str) -> str:
    lines = [ln for ln in text.split("\n") if any(k in ln.lower() for k in KEYWORDS)]
    return "\n".join(lines) or text[:4000]
