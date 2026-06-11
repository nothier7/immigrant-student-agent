# discovery/schema.py — Candidate, CandidateList, VettingResult.

from __future__ import annotations

from pydantic import BaseModel


class Candidate(BaseModel):
    name: str
    url: str
    description: str
    tags: list[str]


class CandidateList(BaseModel):
    candidates: list[Candidate]


class VettingResult(BaseModel):
    relevant: bool
    scam_risk: bool
    reason: str
