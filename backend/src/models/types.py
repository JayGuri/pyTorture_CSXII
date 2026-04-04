from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel


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

LeadClassification = Literal["Hot", "Warm", "Cold"]

Sentiment = Literal["positive", "neutral", "negative"]


# ─── Models ───────────────────────────────────────────────

class SessionState(BaseModel):
    call_sid: str
    session_id: Optional[str] = None
    language: Language = "en-IN"
    turns: int = 0
    conversation_history: List[Dict[str, str]] = []  # [{role, content}]
    extracted_data: Dict[str, Any] = {}


class LeadData(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    education_level: Optional[str] = None
    field: Optional[str] = None
    institution: Optional[str] = None
    gpa: Optional[float] = None
    target_countries: Optional[List[str]] = None
    course_interest: Optional[str] = None
    intake_timing: Optional[str] = None
    ielts_score: Optional[float] = None
    pte_score: Optional[float] = None
    budget_range: Optional[str] = None
    scholarship_interest: bool = False
    timeline: Optional[str] = None
    persona_type: Optional[str] = None
    lead_score: int = 0
    classification: LeadClassification = "Cold"
    intent_score: int = 0
    financial_score: int = 0
    timeline_score: int = 0
    data_completeness: int = 0


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
