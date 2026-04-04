from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from src.models.types import BudgetStatus, CallStatus, ConSessionStatus, Language, LeadClassification, TestStage


class MemoryMessage(BaseModel):
    role: str
    content: str
    timestamp: str


class CallerMemory(BaseModel):
    messages: List[MemoryMessage] = Field(default_factory=list)
    summary: Optional[str] = None
    last_summary_at: Optional[str] = None
    total_turns: int = 0
    topics_discussed: List[str] = Field(default_factory=list)


class CallRecord(BaseModel):
    call_sid: str
    started_at: str
    ended_at: Optional[str] = None
    duration_seconds: Optional[int] = None
    language: Language = "en-IN"
    turns: int = 0
    status: CallStatus = "active"


class CallerDocument(BaseModel):
    id: str = Field(..., alias="_id")  # _id = phone number
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None

    education_level: Optional[str] = None
    field: Optional[str] = None
    institution: Optional[str] = None
    gpa: Optional[float] = None

    target_countries: List[str] = Field(default_factory=list)
    course_interest: Optional[str] = None
    intake_timing: Optional[str] = None

    test_type: Optional[str] = None
    test_score: Optional[float] = None
    test_stage: TestStage = "not_started"

    budget_range: Optional[str] = None
    budget_status: BudgetStatus = "not_asked"
    scholarship_interest: bool = False

    lead_score: int = 0
    classification: LeadClassification = "Cold"

    callback_requested: bool = False
    competitor_mentioned: bool = False
    ielts_upsell_flag: bool = False

    next_con_session: Optional[str] = None  # ddmmyy/HH:MM format
    con_session_req: ConSessionStatus = "none"

    memory: CallerMemory = Field(default_factory=CallerMemory)
    calls: List[CallRecord] = Field(default_factory=list)

    first_contact: str
    last_contact: str
    updated_at: str

    class Config:
        populate_by_name = True


def build_new_caller_document(phone: str, call_sid: str, now: str) -> dict:
    document = CallerDocument(
        _id=phone,
        phone=phone,
        first_contact=now,
        last_contact=now,
        updated_at=now,
        calls=[
            CallRecord(
                call_sid=call_sid,
                started_at=now,
            )
        ],
    )
    return document.model_dump(mode="python", by_alias=True)
