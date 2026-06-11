# verifier/batch.py — Semaphore(5) caps simultaneous workers (don't hammer
# servers / hit rate limits). gather runs all due resources, waits for all.
# model_dump(mode="json") converts the result (dates included) to a JSON-safe
# dict for the jsonb column.

from __future__ import annotations

import asyncio

from bank import repository
from verifier.verify import verify_resource


async def run_batch(concurrency: int = 5) -> None:
    due = await repository.resources_due_for_verification(max_age_hours=24)

    sem = asyncio.Semaphore(concurrency)

    async def worker(r):
        async with sem:
            try:
                result = await verify_resource(r)
            except Exception as e:
                print(f"[verifier] {r.name}: error — {e}")
                return
            await repository.set_status(
                r.id,
                result.status,
                verification=result.model_dump(mode="json"),
                last_verified_at=result.checked_at,
                deadline=result.selected_deadline,
            )
            print(f"[verifier] {r.name}: {result.status} ({result.reason})")

    await asyncio.gather(*(worker(r) for r in due))
    print(f"[verifier] checked {len(due)} resources")
