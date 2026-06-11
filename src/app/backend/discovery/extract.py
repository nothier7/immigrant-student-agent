# discovery/extract.py — extract candidate resources from a trusted hub page.
# Reuses the structured-output pattern from Layer 2/3.

from __future__ import annotations

from langchain_openai import ChatOpenAI

from discovery.schema import CandidateList
from serving.schema import TAGS

_llm: ChatOpenAI | None = None


def _get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(model="gpt-5.2", temperature=0)
    return _llm


EXTRACT_HUB_SYSTEM = (
    "Extract resource listings from an aggregator page for immigrant/undocumented "
    "students. For each opportunity return name, link, one-line description, and "
    f"applicable tags from this exact list: {', '.join(TAGS)}. "
    "Only list opportunities actually present on the page."
)


async def extract_candidates(hub_text: str) -> CandidateList:
    model = _get_llm().with_structured_output(CandidateList)
    return await model.ainvoke([
        ("system", EXTRACT_HUB_SYSTEM),
        ("user", hub_text[:20000]),
    ])
