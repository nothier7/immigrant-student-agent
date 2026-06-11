# server.py — FastAPI wrapper for the CCNY Student Agent.
#
# Layer 2 serving flow:
#   closure check (reused) -> residency triage (reused) -> router -> retrieve
#   from the resource bank -> grounded synthesis -> cards built from DB rows.
#
# If DATABASE_URL is not configured the app falls back to the legacy
# static-context agent (agent.py), so the app works at every build step.

from __future__ import annotations

import asyncio
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

from agent import Agent, AgentResponse, CLOSING_PHRASES, UNDOC_PATTERN, INSTATE_PATTERN
from bank import repository
from serving.router import route_query
from serving.synthesize import synthesize, to_card

# Initialize legacy agent (fallback when the bank is unavailable;
# may fail if the OpenAI key is missing)
AGENT_ERROR: Optional[Exception] = None
try:
    _agent = Agent()
except Exception as e:
    AGENT_ERROR = e
    _agent = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once at boot: open the shared DB pool if a database is configured.
    dsn = os.environ.get("DATABASE_URL")
    if dsn:
        try:
            await repository.init_pool(dsn)
        except Exception as e:
            print(f"[server] resource bank unavailable, using legacy context: {e}")
    yield
    await repository.close_pool()


app = FastAPI(title="CCNY Student Agent API", lifespan=lifespan)


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
    tags: List[str] = Field(default_factory=list)
    verified: bool = False
    verified_at: Optional[str] = None

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
    t = text.strip().lower()
    return any(x in t for x in ["yes", "yep", "yeah", "yup", "already", "i do", "i am", "in-state", "resident"])

def _is_no(text: str) -> bool:
    t = text.strip().lower()
    return any(x in t for x in ["no", "nope", "not yet", "i don't", "i do not", "out-of-state", "oos"])


def _friendly_closing() -> str:
    return "Of course! If you have any other questions, I'm here to help. Good luck! 🎓"


def _is_closing(message: str) -> bool:
    return bool(CLOSING_PHRASES.match(message.strip()))


def _needs_residency_check(message: str, profile: Optional[Dict[str, Any]]) -> bool:
    if isinstance(profile, dict) and isinstance(profile.get("has_instate"), bool):
        return False
    return bool(UNDOC_PATTERN.search(message)) and not INSTATE_PATTERN.search(message)


def _context_note(
    has_instate: Optional[bool],
    school_key: str,
    profile: Optional[Dict[str, Any]],
) -> str:
    lines: List[str] = []
    if has_instate is True:
        lines.append("Already has in-state tuition; focus on scholarships and financial aid.")
    elif has_instate is False:
        lines.append("Does NOT have in-state tuition yet; explain residency pathways first.")
    if school_key != "ccny":
        lines.append("Not at CCNY; avoid CCNY-only resources and suggest their campus hub.")
    if isinstance(profile, dict):
        if profile.get("status"):
            lines.append(f"Status: {profile['status']}")
        if profile.get("goal"):
            lines.append(f"Goal: {profile['goal']}")
    return "\n".join(f"- {l}" for l in lines)


def _from_agent_response(session_id: str, result: AgentResponse) -> ChatResponse:
    if result.ask:
        return ChatResponse(session_id=session_id, ask=result.ask)
    return ChatResponse(
        session_id=session_id,
        answer_text=result.text,
        sources=[Source(url=s.url, title=s.title) for s in result.sources],
        cards=[ResourceCardOut(
            name=c.name, url=c.url, category=c.category,
            why=c.why, deadline=c.deadline, authority=c.authority,
        ) for c in result.cards],
    )


# ---------- Core pipeline ----------
async def _answer(
    session_id: str,
    message: str,
    has_instate: Optional[bool],
    school_code: Optional[str],
    profile: Optional[Dict[str, Any]],
) -> ChatResponse:
    # 1. Conversational closure — no resources needed.
    if _is_closing(message):
        return ChatResponse(session_id=session_id, answer_text=_friendly_closing())

    school_key = (
        school_code
        or (profile.get("school_code") if isinstance(profile, dict) else None)
        or "ccny"
    ).lower()

    # 2. Residency triage — ask before answering if status is unknown.
    if has_instate is None and _needs_residency_check(message, profile):
        campus_label = "CCNY" if school_key == "ccny" else "your campus"
        return ChatResponse(
            session_id=session_id,
            ask=f"Do you already pay **in-state (resident) tuition** at {campus_label}?",
        )

    # Fallback: bank not configured/reachable -> legacy static-context agent.
    if not repository.pool_ready():
        if _agent is None:
            raise HTTPException(status_code=500, detail=f"Agent not available: {AGENT_ERROR}")
        result = await asyncio.to_thread(
            _agent.run, message,
            has_instate=has_instate, school_code=school_key, profile=profile,
        )
        return _from_agent_response(session_id, result)

    # 3. Route: which tags, and does this even need resources?
    route = await route_query(message)
    if not route.needs_resources:
        return ChatResponse(session_id=session_id, answer_text=_friendly_closing())

    # 4. Retrieve from the bank (stale resources are filtered out by status).
    resources = await repository.get_active_resources(tags=route.tags or None)
    if not resources:
        resources = await repository.get_active_resources(tags=None)

    # 5. Grounded synthesis: answer from these resources only.
    synth = await synthesize(message, resources, _context_note(has_instate, school_key, profile))

    # 6. Cards only for ids the model cited that actually exist
    #    (`if cid in by_id` drops any hallucinated id).
    by_id = {str(r.id): r for r in resources}
    cards = [to_card(by_id[cid]) for cid in synth.cite_ids if cid in by_id]

    return ChatResponse(
        session_id=session_id,
        answer_text=synth.answer_text,
        sources=[Source(url=c["url"], title=c["name"]) for c in cards],
        cards=[ResourceCardOut(**c) for c in cards],
    )


# ---------- Routes ----------
@app.get("/")
def root():
    return {"ok": True, "service": "CCNY Student Agent"}

@app.get("/health")
def health():
    return {
        "ok": AGENT_ERROR is None or repository.pool_ready(),
        "resource_bank": repository.pool_ready(),
        "legacy_agent_error": str(AGENT_ERROR) if AGENT_ERROR else None,
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
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
    has_instate = profile_has_instate if isinstance(profile_has_instate, bool) else None

    # Handle pending residency question
    if sess.get("pending_residency"):
        orig_query = sess.get("orig_query", req.message)

        if has_instate is None:
            # Check NO first — "I do not have in-state" contains "i do" and
            # "in-state" but should be treated as NO, not YES.
            if _is_no(req.message):
                has_instate = False
            elif _is_yes(req.message):
                has_instate = True
            else:
                campus_label = "CCNY" if (sess.get("school_code") or "").lower() == "ccny" else "your campus"
                return ChatResponse(
                    session_id=sid,
                    ask=f"Just to confirm: do you already pay **in-state (resident) tuition** at {campus_label}?",
                )

        sess["pending_residency"] = False
        sess["orig_query"] = None
        return await _answer(sid, orig_query, has_instate, sess.get("school_code"), req.profile)

    # Normal flow
    resp = await _answer(sid, req.message, has_instate, sess.get("school_code"), req.profile)

    # If we asked about residency, save state for the follow-up turn.
    if resp.ask:
        sess["pending_residency"] = True
        sess["orig_query"] = req.message

    return resp


# ---------- Admin (Layer 4 review queue) ----------
def _check_admin(x_admin_key: Optional[str]) -> None:
    expected = os.environ.get("ADMIN_API_KEY")
    if not expected or x_admin_key != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not repository.pool_ready():
        raise HTTPException(status_code=503, detail="Resource bank not configured")


@app.get("/admin/pending")
async def admin_pending(x_admin_key: Optional[str] = Header(default=None)):
    _check_admin(x_admin_key)
    return [r.model_dump(mode="json") for r in await repository.list_pending()]


@app.post("/admin/approve/{resource_id}")
async def admin_approve(resource_id: UUID, x_admin_key: Optional[str] = Header(default=None)):
    _check_admin(x_admin_key)
    await repository.approve(resource_id)
    return {"ok": True}


@app.post("/admin/reject/{resource_id}")
async def admin_reject(resource_id: UUID, x_admin_key: Optional[str] = Header(default=None)):
    _check_admin(x_admin_key)
    await repository.reject(resource_id)
    return {"ok": True}
