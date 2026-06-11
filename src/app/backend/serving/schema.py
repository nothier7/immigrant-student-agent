# serving/schema.py — QueryRoute, Synthesis, and the fixed tag list.

from __future__ import annotations

from pydantic import BaseModel

# The fixed tag vocabulary. The router can only pick from this list, which
# keeps its output aligned with the tags resources actually carry.
TAGS = [
    "scholarship",
    "in-state-tuition",
    "daca",
    "undocumented",
    "financial-aid",
    "work-authorization",
    "general",
]


class QueryRoute(BaseModel):
    tags: list[str]
    needs_resources: bool


class Synthesis(BaseModel):
    answer_text: str
    cite_ids: list[str]
