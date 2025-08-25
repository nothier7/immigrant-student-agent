# server.py — FastAPI wrapper for your LangGraph agent

from __future__ import annotations
import uuid
from pathlib import Path
import sys
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, HTTPException # type: ignore
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load .env next to this file (OPENAI_API_KEY, FIRECRAWL_API_KEY)
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

# Make local modules (workflow.py, prompts.py, models.py, firecrawl.py) importable
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# FastAPI app (defined at module import time)
app = FastAPI(title="CCNY Student Agent API")

# Try to import your agent workflow
WORKFLOW_IMPORT_ERROR = None
try:
    from workflow import Workflow          # <— IMPORTANT: local import
    _workflow = Workflow()

    try:
        from workflow import CURATED_CCNY_URLS  # always exists in our workflow.py
        _workflow.firecrawl.warm_cache(CURATED_CCNY_URLS)
    except Exception:
        pass
    try:
        # Optional: only if you added EXTERNAL_SEEDS in workflow.py
        from workflow import EXTERNAL_SEEDS
        _workflow.firecrawl.warm_cache(EXTERNAL_SEEDS)
    except Exception:
        pass

except Exception as e:
    WORKFLOW_IMPORT_ERROR = e
    _workflow = None

# ----- Models -----
class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str = Field(..., min_length=1)

class ResourceCardOut(BaseModel):
    name: str
    url: str
    category: str
    why: Optional[str] = None
    deadline: Optional[str] = None
    authority: Optional[str] = None

class Source(BaseModel):
    url: str
    title: Optional[str] = None

class ChatResponse(BaseModel):
    session_id: str
    ask: Optional[str] = None
    intent: Optional[str] = None
    answer_text: Optional[str] = None
    sources: List[Source] = Field(default_factory=list)
    cards: List[ResourceCardOut] = Field(default_factory=list)

# Simple in-memory session store
SESSIONS: Dict[str, Dict[str, Any]] = {}

# ----- Routes -----
@app.get("/health")
def health():
    if WORKFLOW_IMPORT_ERROR:
        return {
            "ok": False,
            "error": f"workflow import failed: {repr(WORKFLOW_IMPORT_ERROR)}",
            "cwd": str(BASE_DIR),
        }
    return {"ok": True}

def _is_yes(text: str) -> bool:
    t = text.strip().lower()
    return any(x in t for x in ["yes", "yep", "yeah", "yup", "already", "i do", "i am", "in-state", "resident"])

def _is_no(text: str) -> bool:
    t = text.strip().lower()
    return any(x in t for x in ["no", "nope", "not yet", "i don't", "i do not", "out-of-state", "oos"])

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if _workflow is None:
        raise HTTPException(status_code=500, detail=f"Agent workflow not available: {repr(WORKFLOW_IMPORT_ERROR)}")

    sid = req.session_id or str(uuid.uuid4())
    sess = SESSIONS.setdefault(sid, {"pending_kind": None, "orig_query": None})

    # Handle pending in-state question
    if sess.get("pending_kind") == "residency":
        orig = sess.get("orig_query") or req.message
        if _is_yes(req.message):
            composed = f"I already pay in-state (resident) tuition at CCNY. {orig}"
        elif _is_no(req.message):
            composed = f"I do NOT yet pay in-state (resident) tuition at CCNY. {orig}"
        else:
            return ChatResponse(session_id=sid, ask="Just to confirm: do you already pay **in-state (resident) tuition** at CCNY?")
        sess["pending_kind"] = None
        sess["orig_query"] = None

        res = _workflow.run(composed)
        if res.ask:
            sess["pending_kind"] = "residency"
            sess["orig_query"] = orig
            return ChatResponse(session_id=sid, ask=res.ask)

        return ChatResponse(
            session_id=sid,
            intent=res.intent,
            answer_text=(res.answer.text if res.answer else None),
            sources=[Source(url=s.url or "", title=s.title) for s in (res.answer.sources if res.answer else [])],
            cards=[ResourceCardOut(**c.model_dump()) for c in (res.answer.cards if res.answer else [])],
        )

    # Normal flow
    res = _workflow.run(req.message)
    if res.ask:
        sess["pending_kind"] = "residency"
        sess["orig_query"] = req.message
        return ChatResponse(session_id=sid, ask=res.ask)

    return ChatResponse(
        session_id=sid,
        intent=res.intent,
        answer_text=(res.answer.text if res.answer else None),
        sources=[Source(url=s.url or "", title=s.title) for s in (res.answer.sources if res.answer else [])],
        cards=[ResourceCardOut(**c.model_dump()) for c in (res.answer.cards if res.answer else [])],

    )
