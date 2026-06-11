# discovery/vet.py — cheap deterministic red-flag scan first; LLM judgment
# (with a grounding reason) for relevance + subtler scams. Conservative:
# not relevant or scam -> dropped downstream.

from __future__ import annotations

from langchain_openai import ChatOpenAI

from discovery.schema import Candidate, VettingResult

_llm: ChatOpenAI | None = None


def _get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(model="gpt-5.2", temperature=0)
    return _llm


SCAM_FLAGS = (
    "application fee", "pay to apply", "guaranteed scholarship",
    "guaranteed award", "wire transfer", "processing fee",
)

VET_SYSTEM = (
    "Decide if this is a legitimate, relevant resource for CCNY immigrant/undocumented "
    "students. Flag scam_risk if it asks for fees, guarantees awards, or looks "
    "predatory. Give a short reason."
)


async def vet(candidate: Candidate) -> VettingResult:
    text = (candidate.name + " " + candidate.description).lower()
    if any(flag in text for flag in SCAM_FLAGS):
        return VettingResult(relevant=False, scam_risk=True, reason="matched scam red-flag phrase")
    model = _get_llm().with_structured_output(VettingResult)
    return await model.ainvoke([
        ("system", VET_SYSTEM),
        ("user", f"{candidate.name}\n{candidate.url}\n{candidate.description}"),
    ])
