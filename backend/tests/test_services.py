from __future__ import annotations

import asyncio
import time
from unittest.mock import AsyncMock, patch

from src.services.llm import gemini as gemini_service
from src.services.llm import router as llm_router
from src.services.llm.featherless import FeatherlessProviderError
from src.services.voice_agent import orchestrator as orchestrator_service
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


def test_llm_router_uses_featherless_when_primary_succeeds():
    with (
        patch.object(llm_router.env, "LLM_PRIMARY_PROVIDER", "featherless"),
        patch.object(llm_router.env, "FEATHERLESS_API_KEY", "test-key"),
        patch(
            "src.services.llm.router.featherless_provider.generate_reply",
            new=AsyncMock(return_value="Primary reply"),
        ) as featherless_call,
        patch(
            "src.services.llm.router.gemini_provider.generate_reply",
            new=AsyncMock(return_value="Fallback reply"),
        ) as gemini_call,
    ):
        reply, provider = asyncio.run(
            llm_router.generate_reply_with_fallback(
                "system",
                [{"role": "user", "content": "Hello"}],
                llm_time_budget_sec=2.5,
                request_label="test",
            )
        )

    assert reply == "Primary reply"
    assert provider == "featherless"
    featherless_call.assert_awaited_once()
    gemini_call.assert_not_called()


def test_llm_router_falls_back_to_gemini_on_featherless_timeout():
    with (
        patch.object(llm_router.env, "LLM_PRIMARY_PROVIDER", "featherless"),
        patch.object(llm_router.env, "FEATHERLESS_API_KEY", "test-key"),
        patch(
            "src.services.llm.router.featherless_provider.generate_reply",
            new=AsyncMock(side_effect=asyncio.TimeoutError()),
        ) as featherless_call,
        patch(
            "src.services.llm.router.gemini_provider.generate_reply",
            new=AsyncMock(return_value="Gemini fallback"),
        ) as gemini_call,
    ):
        reply, provider = asyncio.run(
            llm_router.generate_reply_with_fallback(
                "system",
                [{"role": "user", "content": "Hello"}],
                llm_time_budget_sec=2.5,
                request_label="test",
            )
        )

    assert reply == "Gemini fallback"
    assert provider == "gemini"
    featherless_call.assert_awaited_once()
    gemini_call.assert_awaited_once()


def test_llm_router_falls_back_to_gemini_on_featherless_provider_error():
    with (
        patch.object(llm_router.env, "LLM_PRIMARY_PROVIDER", "featherless"),
        patch.object(llm_router.env, "FEATHERLESS_API_KEY", "test-key"),
        patch(
            "src.services.llm.router.featherless_provider.generate_reply",
            new=AsyncMock(
                side_effect=FeatherlessProviderError(
                    "gated_or_unauthorized",
                    "gated",
                    status_code=403,
                    retryable=False,
                )
            ),
        ) as featherless_call,
        patch(
            "src.services.llm.router.gemini_provider.generate_reply",
            new=AsyncMock(return_value="Gemini fallback"),
        ) as gemini_call,
    ):
        reply, provider = asyncio.run(
            llm_router.generate_reply_with_fallback(
                "system",
                [{"role": "user", "content": "Hello"}],
                llm_time_budget_sec=2.5,
                request_label="test",
            )
        )

    assert reply == "Gemini fallback"
    assert provider == "gemini"
    featherless_call.assert_awaited_once()
    gemini_call.assert_awaited_once()


def test_llm_router_skips_featherless_when_budget_too_low():
    with (
        patch.object(llm_router.env, "LLM_PRIMARY_PROVIDER", "featherless"),
        patch.object(llm_router.env, "FEATHERLESS_API_KEY", "test-key"),
        patch.object(llm_router.env, "GEMINI_FALLBACK_MIN_BUDGET_SEC", 0.7),
        patch.object(llm_router.env, "FEATHERLESS_TIMEOUT_SEC", 15),
        patch(
            "src.services.llm.router.featherless_provider.generate_reply",
            new=AsyncMock(return_value="Primary reply"),
        ) as featherless_call,
        patch(
            "src.services.llm.router.gemini_provider.generate_reply",
            new=AsyncMock(return_value="Gemini fallback"),
        ) as gemini_call,
    ):
        reply, provider = asyncio.run(
            llm_router.generate_reply_with_fallback(
                "system",
                [{"role": "user", "content": "Hello"}],
                llm_time_budget_sec=0.5,
                request_label="test",
            )
        )

    assert reply == "Gemini fallback"
    assert provider == "gemini"
    featherless_call.assert_not_called()
    gemini_call.assert_awaited_once()


def test_llm_router_uses_groq_when_primary_provider_is_groq():
    with (
        patch.object(llm_router.env, "LLM_PRIMARY_PROVIDER", "groq"),
        patch.object(llm_router.env, "GROQ_API_KEY", "test-key"),
        patch(
            "src.services.llm.router.groq_provider.generate_reply",
            new=AsyncMock(return_value="Groq reply"),
        ) as groq_call,
        patch(
            "src.services.llm.router.featherless_provider.generate_reply",
            new=AsyncMock(return_value="Primary reply"),
        ) as featherless_call,
        patch(
            "src.services.llm.router.gemini_provider.generate_reply",
            new=AsyncMock(return_value="Fallback reply"),
        ) as gemini_call,
    ):
        reply, provider = asyncio.run(
            llm_router.generate_reply_with_fallback(
                "system",
                [{"role": "user", "content": "Hello"}],
                llm_time_budget_sec=2.5,
                request_label="test",
            )
        )

    assert reply == "Groq reply"
    assert provider == "groq"
    groq_call.assert_awaited_once()
    featherless_call.assert_not_called()
    gemini_call.assert_not_called()


def test_llm_router_does_not_fallback_when_groq_returns_empty():
    with (
        patch.object(llm_router.env, "LLM_PRIMARY_PROVIDER", "groq"),
        patch.object(llm_router.env, "GROQ_API_KEY", "test-key"),
        patch(
            "src.services.llm.router.groq_provider.generate_reply",
            new=AsyncMock(return_value=""),
        ) as groq_call,
        patch(
            "src.services.llm.router.featherless_provider.generate_reply",
            new=AsyncMock(return_value="Primary reply"),
        ) as featherless_call,
        patch(
            "src.services.llm.router.gemini_provider.generate_reply",
            new=AsyncMock(return_value="Fallback reply"),
        ) as gemini_call,
    ):
        reply, provider = asyncio.run(
            llm_router.generate_reply_with_fallback(
                "system",
                [{"role": "user", "content": "Hello"}],
                llm_time_budget_sec=2.5,
                request_label="test",
            )
        )

    assert reply == ""
    assert provider == "none"
    groq_call.assert_awaited_once()
    featherless_call.assert_not_called()
    gemini_call.assert_not_called()


def test_process_turn_uses_routed_llm_for_reply_and_extraction():
    with (
        patch("src.services.voice_agent.orchestrator.get_db", side_effect=RuntimeError("db unavailable")),
        patch(
            "src.services.voice_agent.orchestrator.load_memory",
            new=AsyncMock(return_value={"messages": [], "summary": None, "topics_discussed": []}),
        ),
        patch("src.services.voice_agent.orchestrator.save_turn", new=AsyncMock(return_value=None)),
        patch("src.services.voice_agent.orchestrator.build_system_prompt", return_value="system"),
        patch("src.services.voice_agent.orchestrator.build_extraction_prompt", return_value="extract"),
        patch("src.services.voice_agent.orchestrator.parse_llm_extraction", return_value={}),
        patch("src.services.voice_agent.orchestrator.extract_updates", return_value={}),
        patch("src.services.voice_agent.orchestrator.merge_extractions", return_value={}),
        patch("src.services.voice_agent.orchestrator.score_lead", return_value={}),
        patch(
            "src.services.voice_agent.orchestrator.generate_reply_with_fallback",
            new=AsyncMock(side_effect=[("Main reply", "featherless"), ("{}", "gemini")]),
        ) as routed_llm,
    ):
        reply, _ = asyncio.run(
            orchestrator_service.process_turn(
                phone="+10000000000",
                transcript="hello",
                language="en-IN",
                call_history=[],
                call_sid="CA_TEST",
                caller_doc={},
                is_returning_caller=False,
                llm_time_budget_sec=2.0,
            )
        )

    assert reply == "Main reply"
    assert routed_llm.await_count == 2
