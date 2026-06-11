# verifier/liveness.py — cheap HEAD first, falling back to GET; follows
# redirects; 10s timeout; network errors count as dead.
# Returns (alive, final_url). A dead link short-circuits to `stale`.

from __future__ import annotations

import httpx


async def check_liveness(url: str) -> tuple[bool, str]:
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
            resp = await client.head(url)
            if resp.status_code >= 400:
                resp = await client.get(url)  # some servers reject HEAD
            return resp.status_code < 400, str(resp.url)
    except httpx.HTTPError:
        return False, url
