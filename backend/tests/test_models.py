from __future__ import annotations

from src.models.caller import build_new_caller_document
from src.models.types import ACTIVE_CALLS, get_or_create_state, remove_state
from src.utils.helpers import normalize_phone


def test_normalize_phone_indian_number():
    assert normalize_phone("98765 43210") == "+919876543210"
    assert normalize_phone("+91-98765-43210") == "+919876543210"


def test_build_new_caller_document_defaults():
    document = build_new_caller_document("+919876543210", "CA123", "2026-04-05T10:00:00Z")

    assert document["phone"] == "+919876543210"
    assert document["classification"] == "Cold"
    assert document["lead_score"] == 0
    assert document["calls"][0]["call_sid"] == "CA123"
    assert document["memory"]["messages"] == []


def test_call_state_lifecycle():
    ACTIVE_CALLS.clear()
    state = get_or_create_state("CA999", "+919999999999")

    assert state.call_sid == "CA999"
    assert remove_state("CA999") is not None
    assert "CA999" not in ACTIVE_CALLS
