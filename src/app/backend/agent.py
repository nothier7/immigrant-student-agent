# agent.py — Simplified CCNY Student Support Agent
# Single LLM call with pre-curated static context

from __future__ import annotations
import re
import json
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage


# ---------- Response Models ----------
@dataclass
class SourceLink:
    url: str
    title: Optional[str] = None

@dataclass
class ResourceCard:
    name: str
    url: str
    category: str  # scholarship, grant, benefit, legal, advising, tuition, fellowship
    why: Optional[str] = None
    deadline: Optional[str] = None
    authority: Optional[str] = None

@dataclass
class AgentResponse:
    """Response from the agent - either an answer or a clarifying question."""
    text: Optional[str] = None
    sources: List[SourceLink] = field(default_factory=list)
    cards: List[ResourceCard] = field(default_factory=list)
    ask: Optional[str] = None  # If set, we need to ask the user a question first


# ---------- Static Context (Pre-curated authoritative sources) ----------
STATIC_CONTEXT = """
## CCNY Immigrant Student Center
URL: https://www.ccny.cuny.edu/immigrantstudentcenter
The CCNY Immigrant Student Center provides advising, events, legal referrals, and resources for undocumented and immigrant students at City College of New York.

## Qualifying for In-State Tuition at CCNY
URL: https://www.ccny.cuny.edu/immigrantstudentcenter/qualifying-state-tuition
To qualify for in-state (resident) tuition at CUNY without citizenship:
- Option 1: Attended a NYS high school for 2+ years AND graduated or earned a GED/TASC in NY
- Option 2: Lived in NY for 12+ months with proof of domicile (lease, utility bills, etc.)
Students must sign an affidavit. This applies to undocumented, DACA, TPS, and other non-citizen students.

## CCNY Scholarships for Immigrant Students
URL: https://www.ccny.cuny.edu/immigrantstudentcenter/scholarships
Curated list of scholarships for undocumented/DACA students including TheDream.US, Golden Door Scholars, Hispanic Scholarship Fund, and CCNY-specific awards.

## Financial Aid for Undocumented Students
URL: https://www.ccny.cuny.edu/immigrantstudentcenter/financial-aid
Undocumented students cannot access federal FAFSA but CAN access:
- NYS Dream Act / TAP (state aid through HESC)
- Institutional scholarships
- Private scholarships that don't require citizenship

## CCNY Dream Team
URL: https://www.ccny.cuny.edu/immigrantstudentcenter/ccny-dream-team
Peer support organization for immigrant/undocumented students. Offers community, events, and advocacy training.

## NYS Dream Act (HESC)
URL: https://www.hesc.ny.gov/applying-aid/nys-dream-act/
The José Peralta NYS Dream Act allows eligible undocumented students to apply for state financial aid including TAP, part-time TAP, and other state-funded scholarships. Apply through the HESC Dream Act Application (not FAFSA).

## TheDream.US Scholarships
URL: https://www.thedream.us/
National scholarships for undocumented/DACA students. Offers National Scholarship (up to full tuition) and Opportunity Scholarship. Deadlines are seasonal (typically fall and spring).

## Immigrants Rising Scholarship Database
URL: https://immigrantsrising.org/resource/scholarships/
Regularly updated database of 100+ scholarships that don't require proof of citizenship or legal status.
"""

# ---------- Default Resource Cards ----------
DEFAULT_CARDS = [
    ResourceCard(
        name="CCNY In-State Tuition Guide",
        url="https://www.ccny.cuny.edu/immigrantstudentcenter/qualifying-state-tuition",
        category="tuition",
        authority="CCNY",
        deadline="rolling",
        why="Step-by-step guide to qualify for resident tuition rates"
    ),
    ResourceCard(
        name="NYS Dream Act (TAP/State Aid)",
        url="https://www.hesc.ny.gov/applying-aid/nys-dream-act/",
        category="grant",
        authority="HESC",
        deadline="varies by term",
        why="State financial aid for eligible undocumented students"
    ),
    ResourceCard(
        name="CCNY Immigrant Scholarships",
        url="https://www.ccny.cuny.edu/immigrantstudentcenter/scholarships",
        category="scholarship",
        authority="CCNY",
        deadline="varies",
        why="Curated scholarships for undocumented/DACA students"
    ),
    ResourceCard(
        name="TheDream.US National Scholarship",
        url="https://www.thedream.us/",
        category="scholarship",
        authority="TheDream.US",
        deadline="seasonal",
        why="Up to full tuition for DACA/undocumented students"
    ),
    ResourceCard(
        name="Immigrants Rising Scholarships",
        url="https://immigrantsrising.org/resource/scholarships/",
        category="scholarship",
        authority="Immigrants Rising",
        deadline="rolling",
        why="100+ scholarships without citizenship requirements"
    ),
    ResourceCard(
        name="CCNY Dream Team",
        url="https://www.ccny.cuny.edu/immigrantstudentcenter/ccny-dream-team",
        category="advising",
        authority="CCNY",
        deadline="rolling",
        why="Peer community and support for immigrant students"
    ),
]

# ---------- Regex patterns for triage ----------
UNDOC_PATTERN = re.compile(
    r"\b(undocumented|non[-\s]?citizen|no (?:ssn|green\s*card)|daca|tps|asylee|asylum|sijs)\b", 
    re.IGNORECASE
)
INSTATE_PATTERN = re.compile(
    r"\b(in[-\s]?state|resident tuition|nysda|nys dream act|tap|already pay)\b", 
    re.IGNORECASE
)


# ---------- System Prompt ----------
SYSTEM_PROMPT = """You are a helpful assistant for City College of New York (CCNY) students, specializing in support for undocumented and immigrant students.

Your role:
- Help students understand tuition residency requirements, financial aid options, and scholarships
- Provide clear, actionable guidance based on the context provided
- Always prioritize CCNY, CUNY, HESC (NY state), TheDream.US, and Immigrants Rising as authoritative sources

Key rules:
1. If a student appears undocumented/DACA/TPS and hasn't confirmed they have in-state tuition, explain residency pathways FIRST
2. Never promise eligibility - always direct to official sources for verification
3. Be concise: 1-2 sentence intro, then 4-6 bullet points with specific steps/links
4. Include relevant deadlines when known
5. Only reference CCNY or CUNY-wide resources (not other campuses like Hunter, Baruch, etc.)

Respond in this JSON format:
{
    "answer": "Your helpful response here with markdown formatting",
    "cards": [
        {
            "name": "Resource name",
            "url": "https://...",
            "category": "scholarship|grant|tuition|advising|legal|benefit",
            "authority": "CCNY|CUNY|HESC|TheDream.US|Immigrants Rising",
            "deadline": "deadline if known",
            "why": "Brief reason this is relevant"
        }
    ]
}

Return 3-6 relevant resource cards. Prioritize CCNY resources first, then CUNY-wide, then external."""


class Agent:
    """Simple CCNY Student Support Agent with single LLM call."""
    
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-5.2", temperature=0.1)
    
    def needs_residency_check(self, query: str) -> bool:
        """Check if user appears undocumented but hasn't mentioned tuition status."""
        looks_undoc = bool(UNDOC_PATTERN.search(query))
        mentions_instate = bool(INSTATE_PATTERN.search(query))
        return looks_undoc and not mentions_instate
    
    def run(self, query: str, has_instate: Optional[bool] = None) -> AgentResponse:
        """
        Process a user query and return a response.
        
        Args:
            query: The user's question
            has_instate: If known, whether user already has in-state tuition
        
        Returns:
            AgentResponse with answer text, sources, and resource cards
        """
        # Triage: Ask about residency if needed
        if has_instate is None and self.needs_residency_check(query):
            return AgentResponse(
                ask="Do you already pay **in-state (resident) tuition** at CCNY?"
            )
        
        # Build the prompt with context
        context_note = ""
        if has_instate is True:
            context_note = "\n\nNote: User confirms they already have in-state tuition. Focus on scholarships and financial aid."
        elif has_instate is False:
            context_note = "\n\nNote: User does NOT have in-state tuition yet. Prioritize explaining residency pathways first."
        
        user_message = f"""Context about CCNY resources:
{STATIC_CONTEXT}

---

User question: {query}{context_note}

Provide a helpful response with relevant resource cards."""

        try:
            response = self.llm.invoke([
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=user_message)
            ])
            
            return self._parse_response(response.content or "")
        except Exception as e:
            # Fallback response if LLM fails
            return AgentResponse(
                text="I'm having trouble connecting right now. Here are key resources to get started:",
                sources=[SourceLink(url=c.url, title=c.name) for c in DEFAULT_CARDS],
                cards=DEFAULT_CARDS
            )
    
    def _parse_response(self, content: str) -> AgentResponse:
        """Parse LLM response into structured AgentResponse."""
        # Try to extract JSON from the response
        try:
            json_str = content
            
            # Handle markdown code blocks - use regex to find outermost block
            # This avoids issues if the JSON answer contains internal code blocks
            json_block_pattern = re.compile(
                r'^```(?:json)?\s*\n(.*?)\n```\s*$',
                re.DOTALL | re.MULTILINE
            )
            match = json_block_pattern.search(content)
            if match:
                json_str = match.group(1).strip()
            else:
                # Fallback: try to find JSON object directly
                # Look for content between first { and last }
                first_brace = content.find('{')
                last_brace = content.rfind('}')
                if first_brace != -1 and last_brace > first_brace:
                    json_str = content[first_brace:last_brace + 1]
            
            data = json.loads(json_str)
            
            answer = data.get("answer", "")
            cards_data = data.get("cards", [])
            
            cards = []
            sources = []
            
            for c in cards_data[:6]:  # Limit to 6 cards
                if isinstance(c, dict) and c.get("name") and c.get("url"):
                    cards.append(ResourceCard(
                        name=c["name"],
                        url=c["url"],
                        category=c.get("category", "benefit"),
                        authority=c.get("authority"),
                        deadline=c.get("deadline"),
                        why=c.get("why")
                    ))
                    sources.append(SourceLink(url=c["url"], title=c["name"]))
            
            # Use defaults if no cards extracted
            if not cards:
                cards = DEFAULT_CARDS
                sources = [SourceLink(url=c.url, title=c.name) for c in DEFAULT_CARDS]
            
            return AgentResponse(text=answer, sources=sources, cards=cards)
            
        except (json.JSONDecodeError, ValueError):
            # If JSON parsing fails, treat as plain text response
            return AgentResponse(
                text=content,
                sources=[SourceLink(url=c.url, title=c.name) for c in DEFAULT_CARDS],
                cards=DEFAULT_CARDS
            )

