# server.py — FastAPI wrapper for the simplified CCNY Student Agent

from __future__ import annotations
import os
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

# Import the simplified agent
from agent import Agent, AgentResponse

app = FastAPI(title="CCNY Student Agent API")

# Initialize agent (may fail if OpenAI key missing)
AGENT_ERROR: Optional[Exception] = None
try:
    _agent = Agent()
except Exception as e:
    AGENT_ERROR = e
    _agent = None


# ---------- Request/Response Models ----------
class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str = Field(..., min_length=1)
    school_code: Optional[str] = None
    profile: Optional[Dict[str, Any]] = None

class Source(BaseModel):
    url: str
    title: Optional[str] = None

class ResourceCardOut(BaseModel):
    name: str
    url: str
    category: str
    why: Optional[str] = None
    deadline: Optional[str] = None
    authority: Optional[str] = None

class ChatResponse(BaseModel):
    session_id: str
    ask: Optional[str] = None
    answer_text: Optional[str] = None
    sources: List[Source] = Field(default_factory=list)
    cards: List[ResourceCardOut] = Field(default_factory=list)


# ---------- Session State ----------
# Simple in-memory sessions (for residency question flow)
SESSIONS: Dict[str, Dict[str, Any]] = {}


# ---------- Helpers ----------
def _is_yes(text: str) -> bool:
    """Check if user response indicates 'yes' to in-state tuition."""
    t = text.strip().lower()
    return any(x in t for x in ["yes", "yep", "yeah", "yup", "already", "i do", "i am", "in-state", "resident"])

def _is_no(text: str) -> bool:
    """Check if user response indicates 'no' to in-state tuition."""
    t = text.strip().lower()
    return any(x in t for x in ["no", "nope", "not yet", "i don't", "i do not", "out-of-state", "oos"])

def _format_response(session_id: str, result: AgentResponse) -> ChatResponse:
    """Convert AgentResponse to ChatResponse."""
    if result.ask:
        return ChatResponse(session_id=session_id, ask=result.ask)
    
    return ChatResponse(
        session_id=session_id,
        answer_text=result.text,
        sources=[Source(url=s.url, title=s.title) for s in result.sources],
        cards=[ResourceCardOut(
            name=c.name,
            url=c.url,
            category=c.category,
            why=c.why,
            deadline=c.deadline,
            authority=c.authority
        ) for c in result.cards]
    )


# ---------- Routes ----------
@app.get("/")
def root():
    return {"ok": True, "service": "CCNY Student Agent"}

@app.get("/health")
def health():
    if AGENT_ERROR:
        return {"ok": False, "error": str(AGENT_ERROR)}
    return {"ok": True}

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if _agent is None:
        raise HTTPException(status_code=500, detail=f"Agent not available: {AGENT_ERROR}")
    
    sid = req.session_id or str(uuid.uuid4())
    sess = SESSIONS.setdefault(sid, {"pending_residency": False, "orig_query": None, "school_code": None})
    if req.school_code:
        sess["school_code"] = req.school_code

    profile_has_instate = None
    if isinstance(req.profile, dict) and "has_instate" in req.profile:
        profile_has_instate = req.profile.get("has_instate")
        if isinstance(profile_has_instate, str):
            val = profile_has_instate.strip().lower()
            if val in ["yes", "true", "1"]:
                profile_has_instate = True
            elif val in ["no", "false", "0"]:
                profile_has_instate = False
    
    # Handle pending residency question
    if sess.get("pending_residency"):
        orig_query = sess.get("orig_query", req.message)
        if isinstance(profile_has_instate, bool):
            sess["pending_residency"] = False
            sess["orig_query"] = None
            result = _agent.run(orig_query, has_instate=profile_has_instate, school_code=sess.get("school_code"), profile=req.profile)
            return _format_response(sid, result)
        
        # Check NO first - "I do not have in-state" contains "i do" and "in-state"
        # but should be treated as NO, not YES
        if _is_no(req.message):
            has_instate = False
        elif _is_yes(req.message):
            has_instate = True
        else:
            # Unclear response, ask again
            campus_label = "CCNY" if (sess.get("school_code") or "").lower() == "ccny" else "your campus"
            return ChatResponse(
                session_id=sid,
                ask=f"Just to confirm: do you already pay **in-state (resident) tuition** at {campus_label}?"
            )
        
        # Clear pending state and run with known residency status
        sess["pending_residency"] = False
        sess["orig_query"] = None
        result = _agent.run(orig_query, has_instate=has_instate, school_code=sess.get("school_code"), profile=req.profile)
        return _format_response(sid, result)
    
    # Normal flow: run the agent
    result = _agent.run(req.message, has_instate=profile_has_instate if isinstance(profile_has_instate, bool) else None, school_code=sess.get("school_code"), profile=req.profile)
    
    # If agent needs to ask about residency, save state
    if result.ask:
        sess["pending_residency"] = True
        sess["orig_query"] = req.message
    
    return _format_response(sid, result)
