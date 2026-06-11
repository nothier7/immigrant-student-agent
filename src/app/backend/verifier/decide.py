# verifier/decide.py — pure, testable decision logic. No I/O, no LLM.
#
# Keep deadline-role facts; `upcoming` are those still in the future.
# Any upcoming (or rolling) -> valid, with the earliest upcoming as the
# selected deadline. Deadlines exist but none upcoming -> stale (all past).
# None found -> unverifiable (never guess).

from __future__ import annotations

from datetime import date, datetime, timezone

from verifier.schema import DatedFact, VerificationResult

DEADLINE_ROLES = {"final_deadline", "priority_deadline", "rolling"}


def decide_status(facts: list[DatedFact], today: date) -> VerificationResult:
    deadlines = [f for f in facts if f.role in DEADLINE_ROLES]
    upcoming = [f for f in deadlines if f.date is not None and f.date >= today]
    rolling = any(f.role == "rolling" for f in deadlines)

    if upcoming or rolling:
        chosen = min((f.date for f in upcoming), default=None)
        return VerificationResult(
            status="valid",
            reason="open deadline found" if upcoming else "rolling admission",
            dated_facts=facts, selected_deadline=chosen, confidence=0.9,
            checked_at=datetime.now(timezone.utc),
        )
    if deadlines:
        return VerificationResult(
            status="stale",
            reason="all deadlines in the past",
            dated_facts=facts, selected_deadline=None, confidence=0.9,
            checked_at=datetime.now(timezone.utc),
        )
    return VerificationResult(
        status="unverifiable",
        reason="no deadline found on page",
        dated_facts=facts, selected_deadline=None, confidence=0.5,
        checked_at=datetime.now(timezone.utc),
    )
