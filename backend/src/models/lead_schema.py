from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class LeadSchema(BaseModel):
    session_id: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    education_level: Optional[str] = None
    field: Optional[str] = None
    institution: Optional[str] = None
    gpa: Optional[float] = Field(default=None, ge=0, le=10)
    target_countries: Optional[List[str]] = None
    course_interest: Optional[str] = None
    intake_timing: Optional[str] = None
    ielts_score: Optional[float] = Field(default=None, ge=0, le=9)
    pte_score: Optional[float] = Field(default=None, ge=0, le=90)
    budget_range: Optional[str] = None
    budget_status: Literal["disclosed", "deferred", "not_asked"] = "not_asked"
    scholarship_interest: bool = False
    timeline: Optional[str] = None
    application_stage: Optional[str] = None
    persona_type: Optional[str] = None
    lead_score: int = Field(default=0, ge=0, le=100)
    intent_score: int = Field(default=0, ge=0, le=100)
    financial_score: int = Field(default=0, ge=0, le=100)
    timeline_score: int = Field(default=0, ge=0, le=100)
    classification: Literal["Hot", "Warm", "Cold"] = "Cold"
    data_completeness: int = Field(default=0, ge=0, le=100)
    emotional_anxiety: Literal["low", "medium", "high"] = "low"
    emotional_confidence: str = "medium"
    emotional_urgency: str = "low"
    callback_requested: bool = False
    competitor_mentioned: bool = False
    ielts_upsell_flag: bool = False
