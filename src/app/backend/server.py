# server.py — FastAPI wrapper for your LangGraph agent (deadline + fallback)

from __future__ import annotations
import os
import uuid
import sys
import threading
import concurrent.futures
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, HTTPException  # type: ignore
from pydantic import BaseModel, Field
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

app = FastAPI(title="CCNY Student Agent API")

WORKFLOW_IMPORT_ERROR = None
try:
    from workflow import Workflow
    _workflow = Workflow()
except Exception as e:
    WORKFLOW_IMPORT_ERROR = e
    _workflow = None

# -------- models --------
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

SESSIONS: Dict[str, Dict[str, Any]] = {}

# -------- background warm (non-blocking) --------
def _warm_caches_bg():
    if _workflow is None:
        return
    try:
        from workflow import CURATED_CCNY_URLS
        _workflow.firecrawl.warm_cache(CURATED_CCNY_URLS)
    except Exception:
        pass
    try:
        from workflow import EXTERNAL_SEEDS
        _workflow.firecrawl.warm_cache(EXTERNAL_SEEDS)
    except Exception:
        pass

@app.on_event("startup")
def _on_startup():
    threading.Thread(target=_warm_caches_bg, daemon=True).start()

# -------- helpers --------
WORKFLOW_TIMEOUT_S = int(os.getenv("WORKFLOW_TIMEOUT_S", "18"))

def _fallback_sources() -> List[Source]:
    urls = [
        "https://www.ccny.cuny.edu/immigrantstudentcenter",
        "https://www.ccny.cuny.edu/immigrantstudentcenter/qualifying-state-tuition",
        "https://www.ccny.cuny.edu/immigrantstudentcenter/scholarships",
        "https://www.ccny.cuny.edu/immigrantstudentcenter/financial-aid",
        "https://www.hesc.ny.gov/applying-aid/nys-dream-act/",
        "https://www.thedream.us/",
        "https://immigrantsrising.org/resource/scholarships/",
    ]
    return [Source(url=u) for u in urls]

def _run_with_deadline(prompt: str):
    if _workflow is None:
        return None
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
        fut = ex.submit(_workflow.run, prompt)
        try:
            return fut.result(timeout=WORKFLOW_TIMEOUT_S)
        except concurrent.futures.TimeoutError:
            return None

def _is_yes(text: str) -> bool:
    t = text.strip().lower()
    return any(x in t for x in ["yes", "yep", "yeah", "yup", "already", "i do", "i am", "in-state", "resident"])

def _is_no(text: str) -> bool:
    t = text.strip().lower()
    return any(x in t for x in ["no", "nope", "not yet", "i don't", "i do not", "out-of-state", "oos"])

# -------- routes --------
@app.get("/")
def root():
    return {"ok": True, "service": "CCNY Student Agent"}

@app.get("/health")
def health():
    if WORKFLOW_IMPORT_ERROR:
        return {"ok": False, "error": f"workflow import failed: {repr(WORKFLOW_IMPORT_ERROR)}", "cwd": str(BASE_DIR)}
    return {"ok": True}

@app.post("/warm")
def warm():
    if _workflow is None:
        raise HTTPException(status_code=500, detail=f"Agent workflow not available: {repr(WORKFLOW_IMPORT_ERROR)}")
    threading.Thread(target=_warm_caches_bg, daemon=True).start()
    return {"ok": True, "message": "Warmup started in background."}

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if _workflow is None:
        raise HTTPException(status_code=500, detail=f"Agent workflow not available: {repr(WORKFLOW_IMPORT_ERROR)}")

    sid = req.session_id or str(uuid.uuid4())
    sess = SESSIONS.setdefault(sid, {"pending_kind": None, "orig_query": None})

    # handle pending residency question
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

        res = _run_with_deadline(composed)
        if res is None:
            return ChatResponse(
                session_id=sid,
                answer_text="Our server is fetching sources. Here are the key links to get started right now.",
                sources=_fallback_sources(),
            )
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

    # normal flow
    res = _run_with_deadline(req.message)
    if res is None:
        return ChatResponse(
            session_id=sid,
            answer_text="Our server is fetching sources. Here are the key links to get started right now.",
            sources=_fallback_sources(),
        )
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
