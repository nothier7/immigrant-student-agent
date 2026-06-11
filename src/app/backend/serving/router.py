# serving/router.py — a single structured classification call (not an agent).

from __future__ import annotations

from langchain_openai import ChatOpenAI

from serving.schema import TAGS, QueryRoute

# temperature=0 for consistency: same question -> same tags.
# Lazy init so the server can import (and fall back) without an API key.
_llm: ChatOpenAI | None = None


def _get_llm() -> ChatOpenAI:
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(model="gpt-5.2", temperature=0)
    return _llm


ROUTER_SYSTEM = (
    "You classify a CCNY immigrant-student's question. "
    f"Pick any applicable tags from this exact list: {', '.join(TAGS)}. "
    "Set needs_resources to false only for greetings or thanks — anything that "
    "could use a scholarship, tuition, aid, or support resource needs resources."
)


async def route_query(message: str) -> QueryRoute:
    # with_structured_output(QueryRoute) forces a validated QueryRoute back —
    # no JSON parsing, no "hope the model formatted it right".
    model = _get_llm().with_structured_output(QueryRoute)
    return await model.ainvoke([("system", ROUTER_SYSTEM), ("user", message)])
