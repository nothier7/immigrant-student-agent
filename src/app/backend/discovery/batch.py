# discovery/batch.py -- the function IS the pipeline:
# trusted hub or search result -> fetch/extract -> drop if known by URL ->
# drop if vetting fails -> embed and drop if semantic duplicate -> otherwise
# admit to the verifier or review queue.

from __future__ import annotations

import asyncio
import os
from datetime import date
from urllib.parse import urljoin, urlparse

from bank import repository
from discovery.embed import embed
from discovery.extract import extract_candidates
from discovery.schema import Candidate
from discovery.search import SearchResult, brave_search_configured, search_web
from discovery.vet import vet
from serving.schema import TAGS
from verifier.fetch import fetch_text  # discovery's fetcher is the verifier's

HUBS = [
    "https://immigrantsrising.org/resource/scholarships/",
    "https://www.hesc.ny.gov/applying-aid/nys-dream-act/",
    "https://www.ccny.cuny.edu/immigrantstudentcenter/scholarships",
]

SEARCH_QUERY_TEMPLATES = [
    "undocumented student scholarships 2026",
    "DACA scholarship deadline 2026",
    "immigrant student emergency grant",
    "New York undocumented student financial aid",
    "site:.edu undocumented students scholarship",
    "site:.edu DACA students scholarship deadline",
    "site:cuny.edu immigrant student resources",
    "site:cuny.edu undocumented student scholarship",
    "site:ny.gov undocumented student financial aid",
    "site:org immigrant student scholarship application",
    "Dream Act scholarship immigrant students",
    "first generation immigrant student scholarship",
]

ALLOWED_TAGS = set(TAGS)
TRUSTED_DOMAIN_SUFFIXES = (
    ".edu",
    ".gov",
    "cuny.edu",
    "ccny.cuny.edu",
    "hesc.ny.gov",
    "immigrantsrising.org",
)


def _env_int(name: str, default: int, *, minimum: int, maximum: int) -> int:
    try:
        value = int(os.environ.get(name, default))
    except ValueError:
        return default
    return max(minimum, min(value, maximum))


def search_queries_for_run(today: date | None = None, limit: int | None = None) -> list[str]:
    today = today or date.today()
    limit = limit if limit is not None else _env_int("DISCOVERY_SEARCH_QUERIES_PER_RUN", 10, minimum=0, maximum=25)
    if limit <= 0:
        return []
    limit = min(limit, len(SEARCH_QUERY_TEMPLATES))
    start = today.toordinal() % len(SEARCH_QUERY_TEMPLATES)
    return [SEARCH_QUERY_TEMPLATES[(start + i) % len(SEARCH_QUERY_TEMPLATES)] for i in range(limit)]


def _search_results_per_query() -> int:
    return _env_int("DISCOVERY_SEARCH_RESULTS_PER_QUERY", 5, minimum=1, maximum=10)


def _search_result_concurrency() -> int:
    return _env_int("DISCOVERY_SEARCH_RESULT_CONCURRENCY", 5, minimum=1, maximum=10)


def _valid_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _is_trusted_url(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    host = host[4:] if host.startswith("www.") else host
    return any(host == suffix or host.endswith(suffix) for suffix in TRUSTED_DOMAIN_SUFFIXES)


def _admission_status(url: str, *, source: str) -> str:
    if source.startswith("hub:") or _is_trusted_url(url):
        return "unverified"
    return "pending_review"


def _normalize_candidate(candidate: Candidate, *, base_url: str | None = None) -> Candidate | None:
    url = urljoin(base_url or "", candidate.url.strip())
    if not _valid_url(url):
        return None
    tags = [tag for tag in candidate.tags if tag in ALLOWED_TAGS]
    if not tags:
        tags = ["general"]
    return candidate.model_copy(update={"url": url, "tags": tags})


def _tags_from_search_result(result: SearchResult) -> list[str]:
    text = f"{result.query} {result.title} {result.description}".lower()
    tags = []
    if "scholarship" in text or "fellowship" in text:
        tags.append("scholarship")
    if "daca" in text:
        tags.append("daca")
    if "undocumented" in text or "dreamer" in text:
        tags.append("undocumented")
    if "financial aid" in text or "grant" in text or "tap" in text:
        tags.append("financial-aid")
    if "in-state" in text or "dream act" in text:
        tags.append("in-state-tuition")
    return tags or ["general"]


async def _queue_candidate(candidate: Candidate, *, source: str, base_url: str | None = None) -> bool:
    normalized = _normalize_candidate(candidate, base_url=base_url)
    if normalized is None:
        print(f"[discovery] dropped {candidate.name}: invalid URL from {source}")
        return False
    if await repository.url_exists(normalized.url):
        return False
    v = await vet(normalized)
    if not v.relevant or v.scam_risk:
        print(f"[discovery] dropped {normalized.name}: {v.reason}")
        return False
    emb = await embed(f"{normalized.name} {normalized.description}")
    if await repository.find_similar(emb):
        print(f"[discovery] duplicate {normalized.name}")
        return False
    status = _admission_status(normalized.url, source=source)
    await repository.insert_candidate(normalized, emb, status=status)
    destination = "verifier" if status == "unverified" else "review"
    print(f"[discovery] queued {normalized.name} for {destination} from {source}")
    return True


async def discover_from_hub(hub_url: str) -> None:
    try:
        candidates = (await extract_candidates(await fetch_text(hub_url))).candidates
    except Exception as e:
        print(f"[discovery] {hub_url}: fetch/extract failed — {e}")
        return

    for candidate in candidates:
        await _queue_candidate(candidate, source=f"hub:{hub_url}", base_url=hub_url)


async def discover_from_search_result(result: SearchResult) -> None:
    fallback = Candidate(
        name=result.title,
        url=result.url,
        description=result.description or f"Search result for {result.query}",
        tags=_tags_from_search_result(result),
    )
    if await repository.url_exists(result.url):
        return

    try:
        page_text = await fetch_text(result.url)
        extracted = (await extract_candidates(page_text)).candidates
    except Exception as e:
        print(f"[discovery] {result.url}: fetch/extract failed — {e}")
        extracted = []

    candidates = extracted or [fallback]
    for candidate in candidates:
        await _queue_candidate(candidate, source=f"search:{result.query}", base_url=result.url)


async def discover_from_search_query(query: str, semaphore: asyncio.Semaphore) -> None:
    try:
        results = await search_web(query, count=_search_results_per_query())
    except Exception as e:
        print(f"[discovery] search failed for {query}: {e}")
        return

    async def guarded(result: SearchResult) -> None:
        async with semaphore:
            await discover_from_search_result(result)

    await asyncio.gather(*(guarded(result) for result in results))


async def run_discovery() -> None:
    tasks = [discover_from_hub(hub) for hub in HUBS]
    if brave_search_configured():
        search_semaphore = asyncio.Semaphore(_search_result_concurrency())
        tasks.extend(discover_from_search_query(query, search_semaphore) for query in search_queries_for_run())
    else:
        print("[discovery] BRAVE_SEARCH_API_KEY not set; skipping search discovery")
    await asyncio.gather(*tasks)
