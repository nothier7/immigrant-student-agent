# serving/synthesize.py — grounded synthesis: the model answers using ONLY the
# retrieved resources and tells us which ones it used. Cards are built from DB
# rows, never from model output — that is the hallucination guard.

from __future__ import annotations

from langchain_openai import ChatOpenAI

from bank.models import Resource
from serving.schema import Synthesis

# Slightly higher temperature for natural answer prose (still grounded).
# Lazy init so the server can import (and fall back) without an API key.
_llm: ChatOpenAI | None = None


def _get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(model="gpt-5.2", temperature=0.3)
    return _llm

SYNTH_SYSTEM = (
    "You help CCNY immigrant and undocumented students. "
    "Answer using ONLY the resources provided. Be concise: a 1-2 sentence intro, "
    "then a few bullet points with concrete steps. Use markdown. "
    "Return your answer plus cite_ids: the ids of the resources you actually used. "
    "If nothing fits, say so honestly and return an empty cite_ids list. "
    "Never promise eligibility — direct students to official sources to confirm."
)


def _format_resources(resources: list[Resource]) -> str:
    return "\n".join(
        f"[{r.id}] {r.name} — {r.description or ''} "
        f"(category: {r.category}; authority: {r.authority or 'n/a'}; "
        f"deadline: {r.deadline.isoformat() if r.deadline else 'unknown'}; "
        f"tags: {', '.join(r.tags)})"
        for r in resources
    )


async def synthesize(
    message: str, resources: list[Resource], context_note: str = ""
) -> Synthesis:
    model = _get_llm().with_structured_output(Synthesis)
    user = f"Question: {message}\n"
    if context_note:
        user += f"\nContext about the student:\n{context_note}\n"
    user += f"\nResources:\n{_format_resources(resources)}"
    return await model.ainvoke([("system", SYNTH_SYSTEM), ("user", user)])


def to_card(r: Resource) -> dict:
    """Build a card from the DB row, not the model. The model only chooses
    WHICH resources to show; it can't fabricate a factual field."""
    return {
        "name": r.name,
        "url": r.url,
        "category": r.category,
        "authority": r.authority,
        "deadline": r.deadline.isoformat() if r.deadline else None,
        "why": r.description,
        "tags": r.tags,
        "verified": r.status == "valid",
        "verified_at": r.last_verified_at.isoformat() if r.last_verified_at else None,
    }
