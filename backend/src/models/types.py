from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal

Language = Literal["en-IN", "hi-IN", "mr-IN"]
LeadClassification = Literal["Hot", "Warm", "Cold"]
TestStage = Literal["not_started", "preparing", "completed"]
BudgetStatus = Literal["disclosed", "deferred", "not_asked"]
CallStatus = Literal["active", "completed", "dropped", "no-answer"]
ConSessionStatus = Literal["none", "approved", "denied", "in_process"]


@dataclass
class CallState:
    call_sid: str
    phone: str
    language: Language = "en-IN"
    turns: int = 0
    stt_failures: int = 0
    call_history: List[Dict[str, str]] = field(default_factory=list)
    caller_doc: Dict[str, Any] = field(default_factory=dict)
    is_returning_caller: bool = False
    last_ai_reply: str = ""


ACTIVE_CALLS: Dict[str, CallState] = {}


def get_or_create_state(call_sid: str, phone: str) -> CallState:
    if call_sid not in ACTIVE_CALLS:
        ACTIVE_CALLS[call_sid] = CallState(call_sid=call_sid, phone=phone)
    return ACTIVE_CALLS[call_sid]


def remove_state(call_sid: str) -> CallState | None:
    return ACTIVE_CALLS.pop(call_sid, None)
