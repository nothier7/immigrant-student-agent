from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

ALLOWED_INTENTS = [
    "residency",
    "financial_aid",
    "scholarships",
    "registration",
    "calendar",
    "it_support",
    "advising",
    "housing",
    "tuition_billing",
    "student_life",
    "general",
]


class ResourceCard(BaseModel):
    name: str
    url: str
    category: Literal["scholarship","grant","benefit","legal","advising","tuition","fellowship"]
    why: Optional[str] = None          # why this student likely qualifies
    deadline: Optional[str] = None     # e.g., “Feb 28” or “rolling”
    authority: Optional[str] = None    # “CCNY”, “CUNY”, “HESC”, “TheDream.US”


class SourceLink(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None

class StudentAnswer(BaseModel):
    text: str
    sources: List[SourceLink] = Field(default_factory=list)
    cards: List[ResourceCard] = Field(default_factory=list)

class AgentState(BaseModel):
    query: str
    intent: str = "general"
    search_results: List[Dict[str, Any]] = Field(default_factory=list)
    contexts: List[Dict[str, str]] = Field(default_factory=list)  # {"url": str, "content": str}
    answer: Optional[StudentAnswer] = None

    # When set, the workflow halts this turn and asks the user first
    ask: Optional[str] = None
