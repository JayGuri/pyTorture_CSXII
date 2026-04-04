from __future__ import annotations

import asyncio
import time
from unittest.mock import patch

from src.services.llm import gemini as gemini_service
from src.services.voice_agent.extractor import extract_updates
from src.services.voice_agent.prompt_builder import build_system_prompt
from src.services.voice_agent.scorer import score_lead


def test_extract_updates_for_first_time_caller():
    transcript = (
        "Hi, my name is Riya Sharma. I am from Pune and planning for UK. "
        "I want to study MSc Data Science. My IELTS score is 6.5 and my budget is 18 lakh."
    )

    updates = extract_updates(transcript, {})

    assert updates["name"] == "Riya Sharma"
    assert updates["location"] == "Pune"
    assert updates["target_countries"] == ["UK"]
    assert updates["test_type"] == "IELTS"
    assert updates["test_score"] == 6.5
    assert updates["budget_range"] == "18 Lakh INR"


def test_extract_updates_does_not_overwrite_confirmed_fields():
    transcript = "My name is Aarav and I am from Mumbai."
    existing = {"name": "Already Known", "location": "Delhi"}

    updates = extract_updates(transcript, existing)

    assert "name" not in updates
    assert "location" not in updates


def test_score_lead_hot_candidate():
    caller_doc = {
        "course_interest": "MSc Data Science",
        "target_countries": ["UK"],
        "education_level": "Undergraduate",
        "field": "Computer Science",
        "gpa": 8.3,
        "test_type": "IELTS",
        "test_score": 6.5,
        "budget_range": "20 Lakh INR",
        "budget_status": "disclosed",
        "scholarship_interest": True,
        "intake_timing": "September 2025",
        "callback_requested": True,
    }

    result = score_lead(caller_doc)

    assert result["classification"] == "Hot"
    assert result["lead_score"] >= 65


def test_prompt_builder_switches_between_onboarding_and_returning_modes():
    caller_doc = {"name": "Riya", "target_countries": ["UK"], "course_interest": "MSc Data Science"}

    new_prompt = build_system_prompt(caller_doc, "en-IN", [], False)
    returning_prompt = build_system_prompt(caller_doc, "en-IN", ["course"], True)

    assert "FIRST-TIME ONBOARDING MODE" in new_prompt
    assert "RETURNING CALLER MODE" in returning_prompt
    assert "Respect prior context" in returning_prompt


def test_gemini_sets_quota_cooldown_after_quota_error():
    gemini_service._quota_cooldown_until_monotonic = 0.0

    with patch("src.services.llm.gemini._build_model", side_effect=RuntimeError("429 quota exceeded")):
        reply = asyncio.run(
            gemini_service.generate_reply(
                "system",
                [{"role": "user", "content": "Hello"}],
            )
        )

    assert reply == ""
    assert gemini_service._quota_cooldown_until_monotonic > time.monotonic()
    gemini_service._quota_cooldown_until_monotonic = 0.0


def test_gemini_skips_provider_calls_during_quota_cooldown():
    gemini_service._quota_cooldown_until_monotonic = time.monotonic() + 30

    with patch("src.services.llm.gemini._build_model") as build_model:
        reply = asyncio.run(
            gemini_service.generate_reply(
                "system",
                [{"role": "user", "content": "Hello"}],
            )
        )

    assert reply == ""
    build_model.assert_not_called()
    gemini_service._quota_cooldown_until_monotonic = 0.0
