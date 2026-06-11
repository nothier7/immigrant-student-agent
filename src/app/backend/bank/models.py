# bank/models.py — the Resource model every layer shares.
# The table stores more (embedding, raw_snapshot); the app object carries
# only what the app uses.

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class Resource(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    url: str
    category: str = "benefit"
    authority: str | None = None
    source_tier: int = 2
    tags: list[str] = []
    deadline: date | None = None
    deadline_type: str | None = None
    status: str = "unverified"
    last_verified_at: datetime | None = None
    verification: dict | None = None
    added_by: str = "seed"
    created_at: datetime
    updated_at: datetime
