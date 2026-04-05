from __future__ import annotations

import asyncio
import time
from unittest.mock import AsyncMock, patch

from src.models.types import ACTIVE_CALLS, get_or_create_state
from src.routes import twilio_webhook as twilio_module


def test_root_endpoint(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["service"] == "fateh-voice-backend"


def test_health_endpoint_with_mocked_checks(client):
    with (
        patch("src.routes.health._check_mongodb", new=AsyncMock(return_value="ok")),
        patch("src.routes.health._check_groq", new=AsyncMock(return_value="ok")),
        patch("src.routes.health._check_featherless", new=AsyncMock(return_value="ok")),
        patch("src.routes.health._check_gemini", new=AsyncMock(return_value="ok")),
        patch("src.routes.health._check_sarvam", new=AsyncMock(return_value="ok")),
        patch("src.routes.health._check_public_url", return_value="ok"),
    ):
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_voice_entry_returns_language_gather(client):
    with patch("src.routes.twilio_webhook._upsert_caller_for_inbound_call", new=AsyncMock(return_value=({}, False))):
        response = client.post(
            "/webhooks/twilio/voice",
            data={"CallSid": "CA123", "From": "+919876543210"},
        )

    assert response.status_code == 200
    assert "Press 1 for English" in response.text
    assert "<Gather" in response.text


def test_language_route_uses_returning_confirmation_for_returning_caller(client):
    ACTIVE_CALLS.clear()
    state = get_or_create_state("CA555", "+919876543210")
    state.is_returning_caller = True

    with patch("src.routes.twilio_webhook._update_call_record", new=AsyncMock()):
        response = client.post(
            "/webhooks/twilio/language",
            data={"CallSid": "CA555", "From": "+919876543210", "Digits": "1"},
        )

    assert response.status_code == 200
    assert "Welcome back to Fateh Education" in response.text


def test_status_route_supports_voice_status_alias(client):
    ACTIVE_CALLS.clear()
    state_a = get_or_create_state("CA700", "+919876543210")
    state_a.turns = 2
    state_b = get_or_create_state("CA701", "+919876543210")
    state_b.turns = 1

    with patch("src.routes.twilio_webhook._update_call_record", new=AsyncMock()) as update_mock:
        response_primary = client.post(
            "/webhooks/twilio/status",
            data={"CallSid": "CA700", "From": "+919876543210", "CallStatus": "completed", "CallDuration": "12"},
        )
        response_alias = client.post(
            "/webhooks/twilio/voice/status",
            data={"CallSid": "CA701", "From": "+919876543210", "CallStatus": "completed", "CallDuration": "10"},
        )

    assert response_primary.status_code == 200
    assert response_alias.status_code == 200
    assert update_mock.await_count == 2


def test_process_turn_falls_back_to_say_when_tts_fails(client):
    ACTIVE_CALLS.clear()
    twilio_module.PROCESSED_RECORDINGS.clear()

    with (
        patch("src.routes.twilio_webhook.download_twilio_recording", new=AsyncMock(return_value=b"wav-bytes")),
        patch("src.routes.twilio_webhook.transcribe_audio", new=AsyncMock(return_value="I need help with UK admissions")),
        patch("src.routes.twilio_webhook.process_turn", new=AsyncMock(return_value=("Fallback test reply", {}))),
        patch("src.routes.twilio_webhook._update_call_record", new=AsyncMock()),
        patch("src.routes.twilio_webhook.synthesize_speech", new=AsyncMock(side_effect=RuntimeError("Sarvam unavailable"))),
    ):
        response = client.post(
            "/webhooks/twilio/process-turn?lang=en-IN",
            data={
                "CallSid": "CA900",
                "From": "+919876543210",
                "RecordingUrl": "https://example.test/recording",
                "RecordingSid": "RE900",
            },
        )

    assert response.status_code == 200
    assert "<Say" in response.text
    assert "Fallback test reply" in response.text


def test_reply_with_audio_skips_tts_when_budget_is_low():
    async def _run_test():
        with patch("src.routes.twilio_webhook.synthesize_speech", new=AsyncMock(return_value=b"audio")) as tts_mock:
            response = await twilio_module._reply_with_audio_or_say(
                call_sid="CA_LOW_BUDGET",
                reply="Budget fallback reply",
                language="en-IN",
                continue_call=True,
                deadline_monotonic=time.monotonic() + 0.01,
            )

            assert b"<Say" in response.body
            assert b"Budget fallback reply" in response.body
            tts_mock.assert_not_awaited()

    asyncio.run(_run_test())


def test_process_turn_skips_orchestrator_when_budget_too_low(client):
    ACTIVE_CALLS.clear()
    twilio_module.PROCESSED_RECORDINGS.clear()

    with (
        patch("src.routes.twilio_webhook.download_twilio_recording", new=AsyncMock(return_value=b"wav-bytes")),
        patch("src.routes.twilio_webhook.transcribe_audio", new=AsyncMock(return_value="Need help with admissions")),
        patch("src.routes.twilio_webhook.process_turn", new=AsyncMock(return_value=("Should not be used", {}))) as orchestrator_mock,
        patch("src.routes.twilio_webhook._update_call_record", new=AsyncMock()),
        patch("src.routes.twilio_webhook.synthesize_speech", new=AsyncMock(side_effect=RuntimeError("Use Polly fallback"))),
        patch.object(twilio_module.env, "TWILIO_WEBHOOK_FAST_DEADLINE_MODE", True),
        patch.object(twilio_module.env, "WEBHOOK_INTERNAL_BUDGET_SEC", 1.0),
        patch.object(twilio_module.env, "WEBHOOK_MIN_TTS_BUDGET_SEC", 1.0),
        patch.object(twilio_module.env, "WEBHOOK_MIN_ORCHESTRATOR_BUDGET_SEC", 5.0),
    ):
        response = client.post(
            "/webhooks/twilio/process-turn?lang=en-IN",
            data={
                "CallSid": "CA901",
                "From": "+919876543210",
                "RecordingUrl": "https://example.test/recording",
                "RecordingSid": "RE901",
            },
        )

    assert response.status_code == 200
    assert "<Say" in response.text
    assert "Thanks, I have noted that." in response.text
    orchestrator_mock.assert_not_awaited()
