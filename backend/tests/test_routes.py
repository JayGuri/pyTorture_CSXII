from __future__ import annotations

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
