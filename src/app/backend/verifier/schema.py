# verifier/schema.py — DatedFact, DateExtraction, VerificationResult.
# Literal[...] restricts a field to exact values — for a structured-output
# schema it constrains the model's allowed outputs, and it encodes the
# three-state rule in the type.

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel


class DatedFact(BaseModel):
    date: date | None
    role: Literal[
        "final_deadline",
        "priority_deadline",
        "rolling",
        "opens",
        "last_updated",
        "event",
        "prior_cycle",
        "other",
    ]
    evidence: str


class DateExtraction(BaseModel):
    """What the LLM returns (kept separate from our decision)."""
    dated_facts: list[DatedFact]


class VerificationResult(BaseModel):
    """What we compute & store."""
    status: Literal["valid", "stale", "unverifiable"]
    reason: str
    dated_facts: list[DatedFact]
    selected_deadline: date | None
    confidence: float
    checked_at: datetime
