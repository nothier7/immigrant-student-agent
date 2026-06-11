# verifier/extract.py — extract every date with role + evidence
# (disambiguation by structure, not by making the model choose).
# "Never infer" guards against fabricated dates; anchoring to resource_name
# separates this resource's dates from unrelated ones.

from __future__ import annotations

from langchain_openai import ChatOpenAI

from verifier.schema import DateExtraction

_llm: ChatOpenAI | None = None


def _get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(model="gpt-5.2", temperature=0)
    return _llm


EXTRACT_SYSTEM = (
    "You extract dates from a web page for a specific resource. "
    "For each, give its role and the exact sentence it came from as evidence. "
    "Only use dates literally written on the page — never infer or guess dates."
)


async def extract_dates(text: str, resource_name: str) -> DateExtraction:
    model = _get_llm().with_structured_output(DateExtraction)
    return await model.ainvoke([
        ("system", EXTRACT_SYSTEM),
        ("user", f"Resource: {resource_name}\n\nPage content:\n{text[:12000]}"),
    ])
