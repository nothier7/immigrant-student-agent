# verifier/verify.py — compose the pipeline for one resource.
#
# Dead -> stale. Evergreen (no deadline-bearing tags) -> valid if the link is
# live (the semantic "still accurate" check is the last refinement).
# Deadline-bearing -> fetch -> locate -> extract -> decide.

from __future__ import annotations

from datetime import date, datetime, timezone

from bank.models import Resource
from verifier.decide import decide_status
from verifier.extract import extract_dates
from verifier.fetch import fetch_text, locate
from verifier.liveness import check_liveness
from verifier.schema import VerificationResult

DEADLINE_BEARING_TAGS = {"scholarship", "financial-aid"}


def is_deadline_bearing(resource: Resource) -> bool:
    return bool(set(resource.tags) & DEADLINE_BEARING_TAGS)


async def verify_resource(resource: Resource) -> VerificationResult:
    alive, final_url = await check_liveness(resource.url)
    if not alive:
        return VerificationResult(
            status="stale", reason="dead link",
            dated_facts=[], selected_deadline=None, confidence=1.0,
            checked_at=datetime.now(timezone.utc),
        )
    if not is_deadline_bearing(resource):
        return VerificationResult(
            status="valid", reason="evergreen resource, link is live",
            dated_facts=[], selected_deadline=None, confidence=0.8,
            checked_at=datetime.now(timezone.utc),
        )
    text = locate(await fetch_text(final_url))
    extraction = await extract_dates(text, resource.name)
    return decide_status(extraction.dated_facts, date.today())
