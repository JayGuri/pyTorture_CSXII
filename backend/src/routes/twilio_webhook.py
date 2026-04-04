from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from time import perf_counter
from typing import Any, Dict, cast
from urllib.parse import urlencode

from fastapi import APIRouter, Query, Request, Response

from src.config.env import env
from src.middleware.auth import validate_twilio_signature
from src.db.supabase_client import supabase
from src.services.stt.sarvam import transcribe_audio, download_twilio_recording
from src.services.cache.redis_client import cache_delete, cache_get, cache_set, cache_set_if_absent
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
PROCESSING_TASKS: Dict[str, asyncio.Task[None]] = {}

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

PROCESSING_REPLY: Dict[Language, str] = {
    "en-IN": "Thanks, I am checking that now. Please share your next question after the beep.",
    "hi-IN": "Dhanyavaad, main abhi check kar rahi hoon. Beep ke baad agla sawaal batayiye.",
    "mr-IN": "धन्यवाद, मी आत्ता तपासत आहे. बीपनंतर पुढचा प्रश्न विचारा.",
}

VOICE_BY_LANGUAGE: Dict[Language, str] = {
    "en-IN": "Polly.Raveena",
    "hi-IN": "Polly.Aditi",
    "mr-IN": "Polly.Aditi",
}

VALID_LANGUAGES: tuple[Language, ...] = ("en-IN", "hi-IN", "mr-IN")


def _pending_reply_key(call_sid: str) -> str:
    return f"twilio:pending-reply:{call_sid}"


def _recording_dedupe_key(recording_sid: str) -> str:
    return f"twilio:recording:dedupe:{recording_sid}"


async def _pop_pending_reply(call_sid: str) -> str:
    key = _pending_reply_key(call_sid)
    cached = await cache_get(key)
    if cached is None:
        return ""

    queue: list[Any]
    if isinstance(cached, list):
        queue = list(cached)
    else:
        queue = [cached]

    first = queue.pop(0)
    if queue:
        await cache_set(key, queue, ttl_seconds=env.ASYNC_REPLY_CACHE_TTL_SEC)
    else:
        await cache_delete(key)

    if isinstance(first, dict):
        return str(first.get("reply", "")).strip()
    if isinstance(first, str):
        return first.strip()
    return ""


async def _push_pending_reply(call_sid: str, reply: str) -> None:
    key = _pending_reply_key(call_sid)
    cached = await cache_get(key)

    queue: list[Any] = []
    if isinstance(cached, list):
        queue = list(cached)
    elif cached is not None:
        queue = [cached]

    queue.append({
        "reply": reply,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    })
    await cache_set(key, queue, ttl_seconds=env.ASYNC_REPLY_CACHE_TTL_SEC)


def _schedule_turn_processing(state: Dict[str, Any], transcript: str, language: Language) -> None:
    call_sid = str(state.get("call_sid", ""))
    previous_task = PROCESSING_TASKS.get(call_sid)

    async def _runner() -> None:
        if previous_task and not previous_task.done():
            try:
                await previous_task
            except Exception as exc:
                logger.warning(f"Previous processing task failed | CallSid={call_sid} err={exc}")

        reply = ""
        try:
            if state.get("session_id"):
                result = await process_turn(state, transcript)
                reply = result.reply
            else:
                analysis_obj = analyze_transcript(transcript, language)
                reply = await generate_simple_reply(transcript, language, analysis_obj.dict())
        except Exception as exc:
            logger.error(f"Background turn processing failed | CallSid={call_sid} err={exc}")

        if not reply:
            reply = FALLBACK_REPLY[language]

        await _push_pending_reply(call_sid, reply)

    task = asyncio.create_task(_runner())
    PROCESSING_TASKS[call_sid] = task

    def _cleanup(completed_task: asyncio.Task[None]) -> None:
        current = PROCESSING_TASKS.get(call_sid)
        if current is completed_task:
            PROCESSING_TASKS.pop(call_sid, None)

    task.add_done_callback(_cleanup)


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
        f'<Record action="{action}" method="POST" maxLength="15" '
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

    # Create initial lead record with phone number (early onboarding)
    if session_id:
        try:
            supabase.table("leads").insert({
                "session_id": session_id,
                "phone": caller,
                "classification": "New",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
            logger.info(f"Lead onboarded | session_id={session_id} phone={caller}")
        except Exception as exc:
            logger.warning(f"Failed to create initial lead record | session_id={session_id} err={exc}")

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

    prior_task = PROCESSING_TASKS.pop(call_sid, None)
    if prior_task and not prior_task.done():
        prior_task.cancel()
    await cache_delete(_pending_reply_key(call_sid))

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
    started = perf_counter()

    form = await request.form()
    call_sid = str(form.get("CallSid", ""))
    recording_url = str(form.get("RecordingUrl", ""))
    recording_sid = str(form.get("RecordingSid", "")).strip()
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
    CALL_STATE[call_sid] = state

    if recording_sid:
        first_seen = await cache_set_if_absent(
            _recording_dedupe_key(recording_sid),
            {"call_sid": call_sid},
            ttl_seconds=env.TWILIO_RECORDING_DEDUPE_TTL_SEC,
        )
        if not first_seen:
            logger.warning(f"Duplicate Twilio recording callback ignored | CallSid={call_sid} RecordingSid={recording_sid}")
            replay = await _pop_pending_reply(call_sid)
            reply_text = replay or PROCESSING_REPLY[language]
            body = _twiml([
                _say(reply_text, language),
                _say(FOLLOW_UP[language], language),
                _record(language),
            ])
            return Response(content=body, media_type="text/xml")

    # No recording? Ask again
    if not recording_url:
        replay = await _pop_pending_reply(call_sid)
        prompt = replay or NO_AUDIO[language]
        body = _twiml([
            _say(prompt, language),
            _say(FOLLOW_UP[language], language),
            _record(language),
        ])
        return Response(content=body, media_type="text/xml")

    download_ms = 0
    stt_ms = 0
    enqueue_ms = 0
    inline_orchestrator_ms = 0
    reply_source = "none"
    reply_text = ""

    try:
        # Download recording from Twilio
        download_started = perf_counter()
        audio_bytes = await download_twilio_recording(
            recording_url,
            timeout_sec=env.WEBHOOK_RECORDING_DOWNLOAD_TIMEOUT_SEC,
        )
        download_ms = int((perf_counter() - download_started) * 1000)

        # Transcribe with Sarvam AI
        stt_started = perf_counter()
        transcript = await transcribe_audio(
            audio_bytes,
            language,
            timeout_sec=env.WEBHOOK_STT_TIMEOUT_SEC,
            max_contracts=env.WEBHOOK_STT_MAX_CONTRACTS,
        )
        stt_ms = int((perf_counter() - stt_started) * 1000)

        if not transcript:
            state["stt_failures"] = int(state.get("stt_failures", 0)) + 1
            CALL_STATE[call_sid] = state

            if state["stt_failures"] >= env.STT_REPROMPT_LIMIT:
                logger.error(
                    f"STT failed repeatedly | CallSid={call_sid} failures={state['stt_failures']}"
                )
                if state.get("session_id"):
                    await broadcast_session_end(state["session_id"], state.get("extracted_data", {}))
                pending_task = PROCESSING_TASKS.pop(call_sid, None)
                if pending_task and not pending_task.done():
                    pending_task.cancel()
                await cache_delete(_pending_reply_key(call_sid))
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

        async def _generate_inline_reply() -> str:
            if state.get("session_id"):
                result = await process_turn(state, transcript)
                return result.reply
            analysis_obj = analyze_transcript(transcript, language)
            return await generate_simple_reply(transcript, language, analysis_obj.dict())

        if env.ORCHESTRATOR_INLINE_ENABLED:
            inline_started = perf_counter()
            try:
                inline_reply = await asyncio.wait_for(
                    _generate_inline_reply(),
                    timeout=env.ORCHESTRATOR_INLINE_TIMEOUT_SEC,
                )
                inline_orchestrator_ms = int((perf_counter() - inline_started) * 1000)
                reply_text = (inline_reply or "").strip() or FALLBACK_REPLY[language]
                reply_source = "inline"
            except asyncio.TimeoutError:
                inline_orchestrator_ms = int((perf_counter() - inline_started) * 1000)
                enqueue_started = perf_counter()
                _schedule_turn_processing(state, transcript, language)
                enqueue_ms = int((perf_counter() - enqueue_started) * 1000)
                reply_text = PROCESSING_REPLY[language]
                reply_source = "timeout_fallback"
                logger.warning(
                    "Inline orchestrator timed out; falling back to queued processing | "
                    f"CallSid={call_sid} timeout={env.ORCHESTRATOR_INLINE_TIMEOUT_SEC}s"
                )
            except Exception as inline_exc:
                inline_orchestrator_ms = int((perf_counter() - inline_started) * 1000)
                enqueue_started = perf_counter()
                _schedule_turn_processing(state, transcript, language)
                enqueue_ms = int((perf_counter() - enqueue_started) * 1000)
                reply_text = PROCESSING_REPLY[language]
                reply_source = "inline_error_fallback"
                logger.error(
                    "Inline orchestrator failed; falling back to queued processing | "
                    f"CallSid={call_sid} err={inline_exc}"
                )
        else:
            enqueue_started = perf_counter()
            _schedule_turn_processing(state, transcript, language)
            enqueue_ms = int((perf_counter() - enqueue_started) * 1000)
            replay = await _pop_pending_reply(call_sid)
            if replay:
                reply_text = replay
                reply_source = "queue_replay"
            else:
                reply_text = PROCESSING_REPLY[language]
                reply_source = "queue_processing"
    except Exception as exc:
        logger.error(f"Processing error | CallSid={call_sid}: {exc}")
        replay = await _pop_pending_reply(call_sid)
        reply_text = replay or FALLBACK_REPLY[language]
        body = _twiml([
            _say(reply_text, language),
            _say(FOLLOW_UP[language], language),
            _record(language),
        ])
        return Response(content=body, media_type="text/xml")

    state["turns"] = state.get("turns", 0) + 1
    CALL_STATE[call_sid] = state

    total_ms = int((perf_counter() - started) * 1000)
    logger.info(
        f"process_recording timings | CallSid={call_sid} "
        f"download_ms={download_ms} stt_ms={stt_ms} inline_orchestrator_ms={inline_orchestrator_ms} "
        f"enqueue_ms={enqueue_ms} reply_source={reply_source} total_ms={total_ms}"
    )

    # Check if max turns reached
    if state["turns"] >= env.MAX_TURNS_PER_CALL:
        # End call
        if state.get("session_id"):
            await broadcast_session_end(state["session_id"], state.get("extracted_data", {}))
        pending_task = PROCESSING_TASKS.pop(call_sid, None)
        if pending_task and not pending_task.done():
            pending_task.cancel()
        await cache_delete(_pending_reply_key(call_sid))
        CALL_STATE.pop(call_sid, None)

        body = _twiml([
            _say(reply_text, language),
            _say(CLOSE[language], language),
            "<Hangup/>",
        ])
        return Response(content=body, media_type="text/xml")
    else:
        body = _twiml([
            _say(reply_text, language),
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
        pending_task = PROCESSING_TASKS.pop(call_sid, None)
        if pending_task and not pending_task.done():
            pending_task.cancel()
        await cache_delete(_pending_reply_key(call_sid))
        CALL_STATE.pop(call_sid, None)

    return Response(status_code=200)
