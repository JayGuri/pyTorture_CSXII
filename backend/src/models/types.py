from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# ─── Enums & Literals ─────────────────────────────────────

Language = Literal["en-IN", "hi-IN", "mr-IN"]

IntentClass = Literal[
    "cost_inquiry",
    "university_inquiry",
    "visa_inquiry",
    "ielts_pte_inquiry",
    "scholarship_inquiry",
    "post_study_work",
    "course_inquiry",
    "ireland_inquiry",
    "document_inquiry",
    "loan_inquiry",
    "profile_collection",
    "general_query",
]

Sentiment = Literal["positive", "neutral", "negative"]


# ─── New Enum Types ───────────────────────────────────────

class PersonaType(str, Enum):
    HIGHLY_RESEARCHED   = "HighlyResearchedScholar"
    ANXIOUS_FIRST_TIMER = "AnxiousFirstTimer"
    PROXY_CALLER        = "ProxyCaller"
    BUDGET_CONSTRAINED  = "BudgetConstrained"
    RETURNING_DROPOUT   = "ReturningDropout"
    UNDETERMINED        = "Undetermined"


class InferredFrom(str, Enum):
    CALLER_ID    = "caller_id"
    CONVERSATION = "conversation"
    NOT_CAPTURED = "not_captured"


class TestStage(str, Enum):
    NOT_STARTED = "not_started"
    PREPARING   = "preparing"
    COMPLETED   = "completed"


class BudgetStatus(str, Enum):
    DISCLOSED = "disclosed"
    DEFERRED  = "deferred"
    NOT_ASKED = "not_asked"


class EmotionLevel(str, Enum):
    LOW    = "low"
    MEDIUM = "medium"
    HIGH   = "high"


class LeadClassification(str, Enum):
    HOT  = "Hot"
    WARM = "Warm"
    COLD = "Cold"


# ─── Nested Data Models ──────────────────────────────────

class LocationData(BaseModel):
    city:          Optional[str] = None
    region:        Optional[str] = None
    inferred_from: InferredFrom  = InferredFrom.NOT_CAPTURED


class EducationData(BaseModel):
    level:          Optional[str]   = None
    field:          Optional[str]   = None
    institution:    Optional[str]   = None
    gpa_percentage: Optional[float] = None


class PreferencesData(BaseModel):
    target_countries: List[str]    = []
    course_interest:  Optional[str] = None
    intake_timing:    Optional[str] = None


class TestStatusData(BaseModel):
    exam_type: Optional[str]   = None   # "IELTS" | "PTE" | "TOEFL"
    score:     Optional[float] = None
    stage:     TestStage       = TestStage.NOT_STARTED


class FinancialData(BaseModel):
    budget_range:         Optional[str] = None
    budget_status:        BudgetStatus  = BudgetStatus.NOT_ASKED
    scholarship_interest: bool          = False


class TimelineData(BaseModel):
    application_stage: Optional[str] = None
    planned_start:     Optional[str] = None   # maps to intake_timing


class EmotionalState(BaseModel):
    anxiety:    EmotionLevel = EmotionLevel.LOW
    confidence: EmotionLevel = EmotionLevel.MEDIUM
    urgency:    EmotionLevel = EmotionLevel.LOW


class LeadScore(BaseModel):
    total:               int = Field(default=0, ge=0, le=100)
    intent_seriousness:  int = Field(default=0, ge=0, le=100)
    financial_readiness: int = Field(default=0, ge=0, le=100)
    timeline_urgency:    int = Field(default=0, ge=0, le=100)
    classification:      LeadClassification = LeadClassification.COLD


class ExtractedData(BaseModel):
    name:        Optional[str]    = None
    phone:       Optional[str]    = None
    email:       Optional[str]    = None
    location:    LocationData     = LocationData()
    education:   EducationData    = EducationData()
    preferences: PreferencesData  = PreferencesData()
    test_status: TestStatusData   = TestStatusData()
    financial:   FinancialData    = FinancialData()
    timeline:    TimelineData     = TimelineData()


class LeadSnapshot(BaseModel):
    """Full structured snapshot stored in counsellor_brief JSONB."""
    session_id:            Optional[str]       = None
    timestamp:             Optional[str]       = None
    persona:               PersonaType         = PersonaType.UNDETERMINED
    extracted_data:        ExtractedData       = ExtractedData()
    lead_score:            LeadScore           = LeadScore()
    recommended_actions:   List[str]           = []
    unresolved_objections: List[str]           = []
    data_completeness:     int = Field(default=0, ge=0, le=12)   # count of 12 fields
    data_completeness_pct: int = Field(default=0, ge=0, le=100)  # for DB column
    emotional_state:       EmotionalState      = EmotionalState()


# ─── Session & Legacy Models ─────────────────────────────

class SessionState(BaseModel):
    call_sid: str
    session_id: Optional[str] = None
    language: Language = "en-IN"
    turns: int = 0
    conversation_history: List[Dict[str, str]] = []  # [{role, content}]
    extracted_data: Dict[str, Any] = {}
    extracted_data_obj: Optional[ExtractedData] = None


class TranscriptEvent(BaseModel):
    session_id: str
    text: str
    is_final: bool
    role: Literal["student", "ai"]
    timestamp: str


class AnalysisResult(BaseModel):
    intent: IntentClass
    sentiment: Sentiment
    entities: Dict[str, List[str]]
    word_count: int
    language: Language
