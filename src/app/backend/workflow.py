import json
import re
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from models import AgentState, StudentAnswer, SourceLink, ALLOWED_INTENTS
from firecrawl import FirecrawlService
from prompts import CCNYPrompts

# ---------- Curated CCNY pages (always included) ----------
CURATED_CCNY_URLS = [
    "https://www.ccny.cuny.edu/immigrantstudentcenter",
    "https://www.ccny.cuny.edu/immigrantstudentcenter/scholarships",
    "https://www.ccny.cuny.edu/immigrantstudentcenter/ccny-dream-team",
    "https://www.ccny.cuny.edu/immigrantstudentcenter/qualifying-state-tuition",
    "https://www.ccny.cuny.edu/immigrantstudentcenter/financial-aid",
]

EXTERNAL_SEEDS = [
    "https://www.hesc.ny.gov/applying-aid/nys-dream-act/",
    "https://www.thedream.us/",
    "https://immigrantsrising.org/resource/scholarships/",
]

# ---------- Allowed domains ----------
ALLOWED_HOSTS = {
    "ccny.cuny.edu", "www.ccny.cuny.edu",
    "cuny.edu", "www.cuny.edu",
    "hesc.ny.gov", "www.hesc.ny.gov",
    "thedream.us", "www.thedream.us",
    "immigrantsrising.org", "www.immigrantsrising.org",
}
CAMPUS_SUBDOMAIN_RE = re.compile(r"\b([a-z0-9-]+)\.cuny\.edu\b", re.I)

# ---------- Heuristics ----------
UNDOC_RE = re.compile(r"\b(undocumented|non[-\s]?citizen|no (?:ssn|green\s*card)|daca|tps|asylee|asylum|sijs)\b", re.I)
INSTATE_RE = re.compile(r"\b(in[-\s]?state|resident tuition|in state tuition|nysda|nys dream act|tap)\b", re.I)

# ---------- Settings ----------
MAX_SCRAPES_PER_TURN = 5
ALLOWED_CATEGORIES = {
    "scholarship", "grant", "benefit", "legal", "advising", "tuition", "fellowship"
}


# =========================
# helpers
# =========================
def _pick_url(item: Dict[str, Optional[str]]) -> Optional[str]:
    u = item.get("url")
    if isinstance(u, str) and u:
        return u if u.startswith(("http://", "https://")) else f"https://{u}"
    return None


def _domain_ok(u: str) -> bool:
    try:
        host = urlparse(u).netloc.lower().split(":")[0]
        if host in ALLOWED_HOSTS:
            return True
        # Block other CUNY campuses (only CCNY allowed)
        m = CAMPUS_SUBDOMAIN_RE.search(host)
        if m and host not in {"ccny.cuny.edu", "www.ccny.cuny.edu"}:
            return False
        return False
    except Exception:
        return False


def _authority_for(url: str) -> str:
    """Map host → human label for the card 'authority'."""
    try:
        host = urlparse(url).netloc.lower().replace("www.", "")
    except Exception:
        return "Source"
    if "ccny.cuny.edu" in host:
        return "CCNY"
    if host == "cuny.edu" or host.endswith(".cuny.edu"):
        return "CUNY"
    if "hesc.ny.gov" in host:
        return "HESC"
    if "thedream.us" in host:
        return "TheDream.US"
    if "immigrantsrising.org" in host:
        return "Immigrants Rising"
    return host


def _first_json_array(text: str) -> Optional[list]:
    """
    Best-effort extractor: returns a JSON array even if the model
    wrapped it in prose or a code block.
    """
    s = (text or "").strip()
    # handle ```json ... ```
    if s.startswith("```"):
        # remove surrounding backticks
        s = s.strip("`").strip()
        # possible 'json' language tag
        if s.lower().startswith("json"):
            s = s[4:].strip()
    # fast path
    if s.startswith("["):
        try:
            return json.loads(s)
        except Exception:
            pass
    # defensive slice between first '[' and last ']'
    try:
        i = s.index("[")
        j = s.rindex("]") + 1
        return json.loads(s[i:j])
    except Exception:
        return None


# =========================
# main workflow
# =========================
class Workflow:
    def __init__(self):
        self.firecrawl = FirecrawlService()
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)
        self.prompts = CCNYPrompts()
        self.workflow = self._build()

    def _build(self):
        g = StateGraph(AgentState)
        g.add_node("classify", self._classify)
        g.add_node("triage", self._triage_residency_first)
        g.add_node("curate", self._curate_ccny_pages)
        g.add_node("search", self._search_allowed)
        g.add_node("scrape", self._scrape_all)
        g.add_node("synthesize", self._synthesize)

        g.set_entry_point("classify")
        g.add_edge("classify", "triage")
        g.add_conditional_edges(
            "triage",
            lambda s: "ask" if s.ask else "go",
            {"ask": END, "go": "curate"},
        )
        g.add_edge("curate", "search")
        g.add_edge("search", "scrape")
        g.add_edge("scrape", "synthesize")
        g.add_edge("synthesize", END)
        return g.compile()

    # ---------- nodes ----------
    def _classify(self, state: AgentState) -> Dict[str, Any]:
        q = state.query
        try:
            resp = self.llm.invoke(
                [
                    SystemMessage(content=self.prompts.INTENT_SYSTEM),
                    HumanMessage(content=self.prompts.intent_user(q)),
                ]
            )
            intent = (resp.content or "general").strip().lower()
            if intent not in ALLOWED_INTENTS:
                intent = "general"
        except Exception:
            intent = "general"
        return {"intent": intent}

    def _triage_residency_first(self, state: AgentState) -> Dict[str, Any]:
        q = state.query
        looks_undoc = bool(UNDOC_RE.search(q))
        mentions_instate = bool(INSTATE_RE.search(q))
        if looks_undoc and not mentions_instate:
            return {
                "ask": "Do you already pay **in-state (resident) tuition** at CCNY?"
            }
        return {}

    def _curate_ccny_pages(self, state: AgentState) -> Dict[str, Any]:
        contexts: List[Dict[str, str]] = []
        # Always include CCNY pages
        for url in CURATED_CCNY_URLS:
            md = self.firecrawl.scrape(url)
            if md:
                contexts.append({"url": url, "content": md[:6000]})

        # For scholarships/financial aid/residency, also bring in system-level seeds
        if state.intent in {"scholarships", "financial_aid", "residency"}:
            for url in EXTERNAL_SEEDS:
                md = self.firecrawl.scrape(url)
                if md:
                    contexts.append({"url": url, "content": md[:6000]})

        return {"contexts": contexts}


    def _search_allowed(self, state: AgentState) -> Dict[str, Any]:
        q = state.query
        if hasattr(self.firecrawl, "is_rate_limited") and self.firecrawl.is_rate_limited():
            # still return externals so we don't show only CCNY
            return {"search_results": [{"url": u, "title": None} for u in EXTERNAL_SEEDS]}

        intent_hint = {
            "residency": "residency in-state resident tuition undocumented dream act tap ccny",
            "financial_aid": "financial aid FAFSA TAP scholarships ccny",
            "scholarships": "scholarship deadlines eligibility ccny engineering",
            "registration": "registrar registration deadlines ccny",
            "calendar": "academic calendar ccny deadlines",
            "it_support": "it service desk wifi account ccny",
            "advising": "academic advising ccny",
            "housing": "housing residence life ccny",
            "tuition_billing": "bursar tuition payment plan ccny",
            "student_life": "clubs organizations student life ccny",
            "general": "ccny immigrant student center scholarships financial aid",
        }.get(state.intent, "ccny immigrant student center")

        site_filter = (
            "site:ccny.cuny.edu OR site:cuny.edu OR site:hesc.ny.gov "
            "OR site:thedream.us OR site:immigrantsrising.org"
        )
        query = f"{q} {intent_hint} {site_filter}"

        results = self.firecrawl.search(query, limit=8) or []
        filtered: List[Dict[str, str | None]] = []
        for r in results:
            u = _pick_url(r)
            if u and _domain_ok(u):
                filtered.append({"url": u, "title": r.get("title")})

        # If nothing survived filtering, include external seeds explicitly
        if not filtered and state.intent in {"scholarships", "financial_aid", "residency"}:
            filtered = [{"url": u, "title": None} for u in EXTERNAL_SEEDS]

        return {"search_results": filtered[:8]}


    def _scrape_all(self, state: AgentState) -> Dict[str, Any]:
        seen = {c["url"] for c in state.contexts}
        contexts: List[Dict[str, str]] = list(state.contexts)

        limited = hasattr(self.firecrawl, "is_rate_limited") and self.firecrawl.is_rate_limited()
        if not limited:
            count = 0
            for r in state.search_results:
                if count >= MAX_SCRAPES_PER_TURN:
                    break
                u = _pick_url(r)
                if not u or u in seen:
                    continue
                md = self.firecrawl.scrape(u)
                if md:
                    contexts.append({"url": u, "content": md[:6000]})
                    seen.add(u)
                    count += 1

        # If we ended up with nothing (rare), at least return curated URLs as sources.
        if not contexts:
            for url in CURATED_CCNY_URLS:
                contexts.append({"url": url, "content": ""})

        return {"contexts": contexts}

    # ---------- cards ----------
    def _make_cards(self, query: str, merged_context: str, intent: str) -> List[Dict[str, Any]]:
        """
        Ask the LLM for 1–6 resource cards (JSON array). Robust to messy outputs.
        Filters to allowed domains and normalizes categories.
        """
        try:
            schema_prompt = (
                "From the provided CCNY/CUNY/HESC/TheDream.US/Immigrants Rising context only, "
                "list 1-6 concrete programs the student likely qualifies for. "
                "Return ONLY JSON (no prose): an array of objects with fields: "
                "{name, url, category, why, deadline, authority}. "
                "Allowed categories: scholarship, grant, benefit, legal, advising, tuition, fellowship. "
                "Prefer CCNY pages, BUT include at least one non-CCNY system resource "
                "(CUNY/HESC/TheDream.US/Immigrants Rising) when relevant. No other campuses."
            )

            j = self.llm.invoke(
                [
                    SystemMessage(content=schema_prompt),
                    HumanMessage(
                        content=f"User: {query}\n\nContext:\n{merged_context[:7000]}\n\nIntent: {intent}"
                    ),
                ]
            )
            raw = j.content or "[]"
            data = _first_json_array(raw) or []
        except Exception:
            data = []

        if not isinstance(data, list):
            return []

        out: List[Dict[str, Any]] = []
        seen = set()
        for item in data[:6]:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or "").strip()
            url = item.get("url")
            url = url if isinstance(url, str) and url.startswith(("http://", "https://")) else ""
            category = str(item.get("category") or "").strip().lower()
            why = (item.get("why") or None)
            deadline = (item.get("deadline") or None)
            authority = (item.get("authority") or None)

            if not name or not url or not _domain_ok(url):
                continue
            if category not in ALLOWED_CATEGORIES:
                low = name.lower()
                if "scholar" in low or "dream" in low:
                    category = "scholarship"
                elif "tuition" in low or "resident" in low:
                    category = "tuition"
                else:
                    category = "benefit"
            if not authority:
                authority = _authority_for(url)

            key = (name.lower(), url.lower())
            if key in seen:
                continue
            seen.add(key)
            out.append(
                {
                    "name": name,
                    "url": url,
                    "category": category,
                    "why": why,
                    "deadline": deadline,
                    "authority": authority,
                }
            )
        return out

    # ---------- final synthesis ----------
    def _synthesize(self, state: AgentState) -> Dict[str, Any]:
        merged = "\n\n---\n\n".join(
            f"URL: {c['url']}\n\n{c['content']}" for c in state.contexts
        )
        sources = [c["url"] for c in state.contexts]

        # Natural-language answer
        try:
            resp = self.llm.invoke(
                [
                    SystemMessage(content=self.prompts.SYNTHESIS_SYSTEM),
                    HumanMessage(
                        content=self.prompts.synthesis_user(
                            state.query, merged, state.intent, sources
                        )
                    ),
                ]
            )
            text = (resp.content or "").strip()
        except Exception:
            text = (
                "I hit a temporary limit fetching pages. Here are the key CCNY/CUNY links to use right now:\n"
                "- CCNY Immigrant Student Center: /immigrantstudentcenter\n"
                "- In-State Tuition: /immigrantstudentcenter/qualifying-state-tuition\n"
                "- Scholarships: /immigrantstudentcenter/scholarships\n"
                "- Financial Aid: /immigrantstudentcenter/financial-aid\n"
                "- HESC NYS Dream Act/TAP: hesc.ny.gov/applying-aid/nys-dream-act/\n"
            )

        # Try to build structured cards from the LLM
        cards: List[Dict[str, Any]] = self._make_cards(state.query, merged, state.intent)

        # Deterministic fallback: if no cards, build a minimal set from curated CCNY pages
        if not cards:
            fallback = [
                {
                    "name": "CCNY In-State (Resident) Tuition for Immigrant Students",
                    "url": "https://www.ccny.cuny.edu/immigrantstudentcenter/qualifying-state-tuition",
                    "category": "tuition",
                    "authority": "CCNY",
                    "deadline": "rolling",
                    "why": "Explains how undocumented/DACA/SIJS students can qualify for resident tuition (e.g., NYS HS attendance or domicile).",
                },
                {
                    "name": "CCNY Immigrant Student Center — Scholarships",
                    "url": "https://www.ccny.cuny.edu/immigrantstudentcenter/scholarships",
                    "category": "scholarship",
                    "authority": "CCNY",
                    "deadline": "varies",
                    "why": "Curated scholarship list relevant to undocumented and DACA students.",
                },
                {
                    "name": "HESC — NYS Dream Act (State Aid)",
                    "url": "https://www.hesc.ny.gov/applying-aid/nys-dream-act/",
                    "category": "grant",
                    "authority": "HESC",
                    "deadline": "varies",
                    "why": "Apply for state aid if you meet NYS Dream Act eligibility.",
                },
                {
                    "name": "TheDream.US — Scholarships",
                    "url": "https://www.thedream.us/",
                    "category": "scholarship",
                    "authority": "TheDream.US",
                    "deadline": "seasonal",
                    "why": "National scholarships for undocumented/DACA students; often open annually.",
                },
                {
                    "name": "CCNY Immigrant Student Center — Financial Aid & Advising",
                    "url": "https://www.ccny.cuny.edu/immigrantstudentcenter/financial-aid",
                    "category": "advising",
                    "authority": "CCNY",
                    "deadline": "rolling",
                    "why": "One-on-one guidance on TAP/Dream Act, documentation, and timelines.",
                },
                {
                    "name": "CCNY Dream Team (Student Org)",
                    "url": "https://www.ccny.cuny.edu/immigrantstudentcenter/ccny-dream-team",
                    "category": "advising",
                    "authority": "CCNY",
                    "deadline": "rolling",
                    "why": "Peer community for undocumented/immigrant students; events and support.",
                },
                {
                    "name": "Immigrants Rising — Scholarship List",
                    "url": "https://immigrantsrising.org/resource/scholarships/",
                    "category": "scholarship",
                    "authority": "Immigrants Rising",
                    "deadline": "varies",
                    "why": "Regularly updated list of scholarships that don't require U.S. citizenship.",
                },

            ]
            # keep only allowed domains (defensive)
            cards = [c for c in fallback if _domain_ok(c["url"])]

        # Build StudentAnswer (compatible if your StudentAnswer lacks 'cards')
        kwargs: Dict[str, Any] = {
            "text": text,
            "sources": [SourceLink(url=u) for u in sources],
        }
        try:
            # pydantic v2: model_fields holds the defined fields
            if hasattr(StudentAnswer, "model_fields") and "cards" in StudentAnswer.model_fields:
                kwargs["cards"] = cards
        except Exception:
            pass

        answer = StudentAnswer(**kwargs)
        return {"answer": answer}

    # ---------- public ----------
    def run(self, query: str) -> AgentState:
        init = AgentState(query=query)
        out = self.workflow.invoke(init)
        return AgentState(**out)
