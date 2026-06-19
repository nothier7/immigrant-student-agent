# verifier/liveness.py — cheap HEAD first, falling back to GET; follows
# redirects; 10s timeout; network errors count as dead.
# Returns (alive, final_url). A dead link short-circuits to `stale`.

from __future__ import annotations

import httpx

RESTRICTED_STATUS_CODES = {401, 403, 429}
REQUEST_HEADERS = {
    "user-agent": "Mozilla/5.0 (compatible; DreamersAgentVerifier/1.0; +https://dreamersagent.org)",
}


async def check_liveness(url: str) -> tuple[bool, str]:
    if not url.strip():
        return False, url

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10, headers=REQUEST_HEADERS) as client:
            resp = await client.head(url)
            if resp.status_code in RESTRICTED_STATUS_CODES:
                return True, str(resp.url)
            if resp.status_code >= 400:
                resp = await client.get(url)  # some servers reject HEAD
            return resp.status_code < 400 or resp.status_code in RESTRICTED_STATUS_CODES, str(resp.url)
    except httpx.HTTPError:
        return False, url
