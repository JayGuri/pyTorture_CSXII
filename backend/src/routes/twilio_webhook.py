from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, cast
from urllib.parse import urlencode

from fastapi import APIRouter, Query, Request, Response

from src.config.env import env
from src.middleware.auth import validate_twilio_signature
from src.db.supabase_client import supabase
from src.services.stt.sarvam import transcribe_audio, download_twilio_recording
from src.services.llm.featherless import generate_simple_reply
from src.services.voice_agent.orchestrator import process_turn
from src.services.voice_agent.intent_classifier import analyze_transcript
from src.services.transcription.live_stream import broadcast_session_end
from src.models.types import Language
from src.utils.logger import logger

router = APIRouter()

TWILIO_WEBHOOK_BASE = "/webhooks/twilio"

# In-memory call state (keyed by CallSid)
CALL_STATE: Dict[str, Dict[str, Any]] = {}

LANGUAGE_BY_DIGIT: Dict[str, Language] = {
    "1": "en-IN",
    "2": "hi-IN",
    "3": "mr-IN",
}

WELCOME_PROMPT = "Welcome to Fateh Education AI assistant. Press 1 for English. Press 2 for Hindi. Press 3 for Marathi."

LANGUAGE_CONFIRMATION: Dict[Language, str] = {
    "en-IN": "You selected English. Please tell me your question after the beep.",
    "hi-IN": "Aapne Hindi chuna hai. Kripya beep ke baad apna sawaal batayiye.",
    "mr-IN": "तुम्ही मराठी निवडली आहे. कृपया बीपनंतर तुमचा प्रश्न सांगा.",
}

FOLLOW_UP: Dict[Language, str] = {
    "en-IN": "You can ask your next question after the beep.",
    "hi-IN": "Beep ke baad aap apna agla sawaal puch sakte hain.",
    "mr-IN": "बीपनंतर तुम्ही पुढचा प्रश्न विचारू शकता.",
}

NO_AUDIO: Dict[Language, str] = {
    "en-IN": "I could not hear any audio. Please speak again after the beep.",
    "hi-IN": "Mujhe aapki awaaz clear nahi mili. Kripya beep ke baad phir boliye.",
    "mr-IN": "मला तुमचा आवाज स्पष्ट ऐकू आला नाही. कृपया पुन्हा बोला.",
}

CLOSE: Dict[Language, str] = {
    "en-IN": "Thanks for calling Fateh Education. Our counsellor will connect with you soon.",
    "hi-IN": "Fateh Education ko call karne ke liye dhanyavaad. Hamara counsellor jald aapse sampark karega.",
    "mr-IN": "Fateh Education ला कॉल केल्याबद्दल धन्यवाद. आमचा काउन्सेलर लवकरच संपर्क करेल.",
}

FALLBACK_REPLY: Dict[Language, str] = {
    "en-IN": "Thanks, I captured your query. A counsellor will follow up with you shortly.",
    "hi-IN": "Dhanyavaad, maine aapka sawaal capture kar liya hai. Counsellor jald sampark karega.",
    "mr-IN": "धन्यवाद, मी तुमचा प्रश्न नोंदवला आहे. काउन्सेलर लवकरच संपर्क करेल.",
}

VOICE_BY_LANGUAGE: Dict[Language, str] = {
    "en-IN": "Polly.Raveena",
    "hi-IN": "Polly.Aditi",
    "mr-IN": "Polly.Aditi",
}

VALID_LANGUAGES: tuple[Language, ...] = ("en-IN", "hi-IN", "mr-IN")


def _build_url(path: str, query: Dict[str, str] | None = None) -> str:
    base = f"{env.normalized_public_url()}{path}"
    if not query:
        return base
    return f"{base}?{urlencode(query)}"


def _twilio_path(path: str) -> str:
    return f"{TWILIO_WEBHOOK_BASE}{path}"


def _normalize_language(value: str | None) -> Language:
    if value in VALID_LANGUAGES:
        return cast(Language, value)
    return "en-IN"


def _escape_xml(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _twiml(parts: list[str]) -> str:
    return f'<?xml version="1.0" encoding="UTF-8"?><Response>{"".join(parts)}</Response>'


def _say(text: str, lang: str) -> str:
    language = _normalize_language(lang)
    voice = VOICE_BY_LANGUAGE[language]
    return f'<Say language="{language}" voice="{voice}">{_escape_xml(text)}</Say>'


def _record(lang: str) -> str:
    action = _build_url(_twilio_path("/process-recording"), {"lang": lang})
    return (
        f'<Record action="{action}" method="POST" maxLength="25" '
        f'timeout="3" playBeep="true" trim="trim-silence" actionOnEmptyResult="true"/>'
    )


def _gather() -> str:
    action = _build_url(_twilio_path("/language"))
    return (
        f'<Gather numDigits="1" action="{action}" method="POST" timeout="6">'
        f'{_say(WELCOME_PROMPT, "en-IN")}</Gather>'
    )


# ─── POST */twilio/voice — Initial inbound call ───

@router.post("/voice")
async def voice(request: Request):
    await validate_twilio_signature(request)

    form = await request.form()
    call_sid = str(form.get("CallSid", ""))
    caller = str(form.get("From", ""))
    call_status = str(form.get("CallStatus", ""))
    logger.info(f"Inbound call | CallSid={call_sid} From={caller} Status={call_status}")

    # Create session in Supabase
    result = (
        supabase.table("call_sessions")
        .upsert(
            {"twilio_call_sid": call_sid, "caller_phone": caller, "status": "ringing"},
            on_conflict="twilio_call_sid",
        )
        .execute()
    )
    session_id = result.data[0]["id"] if result.data else None

    # Initialize in-memory state
    CALL_STATE[call_sid] = {
        "call_sid": call_sid,
        "session_id": session_id,
        "language": "en-IN",
        "turns": 0,
        "stt_failures": 0,
        "conversation_history": [],
        "extracted_data": {"phone": caller},
    }

    redirect_url = _build_url(_twilio_path("/voice"))
    body = _twiml([
        _gather(),
        f'<Redirect method="POST">{redirect_url}</Redirect>',
    ])
    logger.debug(f"TwiML response for /voice | CallSid={call_sid}: {body[:500]}")
    return Response(content=body, media_type="text/xml")


# ─── POST */twilio/language — Language selection via DTMF ───

@router.post("/language")
async def language(request: Request):
    await validate_twilio_signature(request)

    form = await request.form()
    digits = str(form.get("Digits", "")).strip()
    call_sid = str(form.get("CallSid", ""))
    lang: Language = _normalize_language(LANGUAGE_BY_DIGIT.get(digits, "en-IN"))

    state = CALL_STATE.get(call_sid)
    if state:
        state["language"] = lang

    # Update session language
    if state and state.get("session_id"):
        supabase.table("call_sessions").update({
            "language_detected": lang,
            "status": "active",
        }).eq("id", state["session_id"]).execute()

    body = _twiml([
        _say(LANGUAGE_CONFIRMATION[lang], lang),
        _record(lang),
    ])
    return Response(content=body, media_type="text/xml")


# ─── POST */twilio/process-recording — Process recorded audio ───

@router.post("/process-recording")
async def process_recording(request: Request, lang: str = Query(default="en-IN")):
    await validate_twilio_signature(request)

    form = await request.form()
    call_sid = str(form.get("CallSid", ""))
    recording_url = str(form.get("RecordingUrl", ""))
    state = CALL_STATE.get(call_sid)
    state_language = _normalize_language(str(state.get("language", "en-IN")) if state else "en-IN")
    language: Language = _normalize_language(lang) if lang in VALID_LANGUAGES else state_language

    if lang not in VALID_LANGUAGES:
        logger.warning(f"Invalid lang query '{lang}' for CallSid={call_sid}; using '{language}'")

    state = CALL_STATE.get(call_sid, {
        "call_sid": call_sid,
        "language": language,
        "turns": 0,
        "stt_failures": 0,
        "conversation_history": [],
        "extracted_data": {},
    })
    state["language"] = language

    # No recording? Ask again
    if not recording_url:
        body = _twiml([
            _say(NO_AUDIO[language], language),
            _say(FOLLOW_UP[language], language),
            _record(language),
        ])
        return Response(content=body, media_type="text/xml")

    ai_reply = ""
    analysis: Dict[str, Any] = {}

    try:
        # Download recording from Twilio
        audio_bytes = await download_twilio_recording(recording_url)

        # Transcribe with Sarvam AI
        transcript = await transcribe_audio(audio_bytes, language)

        if not transcript:
            state["stt_failures"] = int(state.get("stt_failures", 0)) + 1
            CALL_STATE[call_sid] = state

            if state["stt_failures"] >= env.STT_REPROMPT_LIMIT:
                logger.error(
                    f"STT failed repeatedly | CallSid={call_sid} failures={state['stt_failures']}"
                )
                if state.get("session_id"):
                    await broadcast_session_end(state["session_id"], state.get("extracted_data", {}))
                CALL_STATE.pop(call_sid, None)

                body = _twiml([
                    _say(FALLBACK_REPLY[language], language),
                    _say(CLOSE[language], language),
                    "<Hangup/>",
                ])
                return Response(content=body, media_type="text/xml")

            body = _twiml([
                _say(NO_AUDIO[language], language),
                _say(FOLLOW_UP[language], language),
                _record(language),
            ])
            return Response(content=body, media_type="text/xml")

        state["stt_failures"] = 0

        logger.info(f"Transcript received | CallSid={call_sid} lang={language} text={transcript[:100]}")

        # Run through full orchestrator pipeline
        if state.get("session_id"):
            result = await process_turn(state, transcript)
            ai_reply = result.reply
            analysis = result.analysis
        else:
            # Fallback: direct LLM call without orchestrator
            analysis_obj = analyze_transcript(transcript, language)
            analysis = analysis_obj.dict()
            ai_reply = await generate_simple_reply(transcript, language, analysis)
    except Exception as exc:
        logger.error(f"Processing error | CallSid={call_sid}: {exc}")

    if not ai_reply:
        ai_reply = FALLBACK_REPLY[language]

    state["turns"] = state.get("turns", 0) + 1
    CALL_STATE[call_sid] = state

    # Check if max turns reached
    if state["turns"] >= env.MAX_TURNS_PER_CALL:
        # End call
        if state.get("session_id"):
            await broadcast_session_end(state["session_id"], state.get("extracted_data", {}))
        CALL_STATE.pop(call_sid, None)

        body = _twiml([
            _say(ai_reply, language),
            _say(CLOSE[language], language),
            "<Hangup/>",
        ])
        return Response(content=body, media_type="text/xml")
    else:
        body = _twiml([
            _say(ai_reply, language),
            _say(FOLLOW_UP[language], language),
            _record(language),
        ])
        return Response(content=body, media_type="text/xml")


# ─── POST */twilio/status and */twilio/voice/status — Call status callbacks ───

@router.post("/status")
@router.post("/voice/status")
async def status(request: Request):
    await validate_twilio_signature(request)

    form = await request.form()
    call_sid = str(form.get("CallSid", ""))
    call_status = str(form.get("CallStatus", ""))
    call_duration = str(form.get("CallDuration", "0"))
    logger.info(f"Call status update | CallSid={call_sid} Status={call_status}")

    terminal_statuses = {"completed", "no-answer", "busy", "failed"}
    if call_status in terminal_statuses:
        supabase.table("call_sessions").update({
            "status": "completed" if call_status == "completed" else "no-answer",
            "duration_seconds": int(call_duration),
            "ended_at": datetime.now(timezone.utc).isoformat(),
        }).eq("twilio_call_sid", call_sid).execute()

        state = CALL_STATE.get(call_sid)
        if state and state.get("session_id"):
            await broadcast_session_end(state["session_id"], state.get("extracted_data", {}))
        CALL_STATE.pop(call_sid, None)

    return Response(status_code=200)
