# discovery/batch.py — the function IS the pipeline:
# fetch hub -> extract -> drop if known by URL -> drop if vetting fails ->
# embed and drop if semantic duplicate -> otherwise admit to the review queue.

from __future__ import annotations

import asyncio

from bank import repository
from discovery.embed import embed
from discovery.extract import extract_candidates
from discovery.vet import vet
from verifier.fetch import fetch_text  # discovery's fetcher is the verifier's

HUBS = [
    "https://immigrantsrising.org/resource/scholarships/",
    "https://www.hesc.ny.gov/applying-aid/nys-dream-act/",
    "https://www.ccny.cuny.edu/immigrantstudentcenter/scholarships",
    # ...trusted aggregators only — discovery never crawls the open web
]


async def discover_from_hub(hub_url: str) -> None:
    try:
        candidates = (await extract_candidates(await fetch_text(hub_url))).candidates
    except Exception as e:
        print(f"[discovery] {hub_url}: fetch/extract failed — {e}")
        return

    for c in candidates:
        if await repository.url_exists(c.url):
            continue
        v = await vet(c)
        if not v.relevant or v.scam_risk:
            print(f"[discovery] dropped {c.name}: {v.reason}")
            continue
        emb = await embed(f"{c.name} {c.description}")
        if await repository.find_similar(emb):
            print(f"[discovery] duplicate {c.name}")
            continue
        await repository.insert_candidate(c, emb)
        print(f"[discovery] queued {c.name} for review")


async def run_discovery() -> None:
    await asyncio.gather(*(discover_from_hub(h) for h in HUBS))
