# discovery/embed.py — embeddings for dedup (and, later, semantic retrieval).

from __future__ import annotations

from openai import AsyncOpenAI

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI()
    return _client


async def embed(text: str) -> list[float]:
    resp = await _get_client().embeddings.create(model="text-embedding-3-small", input=text)
    return resp.data[0].embedding  # 1536 floats — matches vector(1536)
