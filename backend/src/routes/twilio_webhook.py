from __future__ import annotations

import asyncio
import time
from typing import Dict

from fastapi import APIRouter, Query, Request, Response as FastAPIResponse
from twilio.twiml.voice_response import Gather, VoiceResponse

from src.config.env import env
from src.db.mongo_client import get_db
from src.middleware.auth import validate_twilio_signature
from src.models.caller import build_new_caller_document
from src.models.types import ACTIVE_CALLS, Language, get_or_create_state, remove_state
from src.services.stt.groq_whisper import download_twilio_recording, transcribe_audio
from src.services.tts.sarvam import cache_tts_audio, synthesize_speech
from src.services.voice_agent.orchestrator import process_turn
from src.utils.helpers import normalize_phone, utc_now_iso
from src.utils.logger import logger

router = APIRouter()

LANGUAGE_BY_DIGIT: Dict[str, Language] = {
    "1": "en-IN",
    "2": "hi-IN",
    "3": "mr-IN",
}

VOICE_BY_LANGUAGE = {
    "en-IN": "Polly.Raveena",
    "hi-IN": "Polly.Aditi",
    "mr-IN": "Polly.Aditi",
}

WELCOME_PROMPT = (
    "Welcome to Fateh Education. Press 1 for English. "
    "Press 2 for Hindi. Press 3 for Marathi."
)

LANGUAGE_CONFIRMATION_NEW = {
    "en-IN": "Hi, I am Priya from Fateh Education. Please tell me how I can help with your study abroad plans today.",
    "hi-IN": "Namaste, main Priya hoon Fateh Education se. Aaj aapko study abroad planning mein kis cheez mein help chahiye?",
    "mr-IN": "Namaskar, mi Priya aahe Fateh Education madhun. Aaj tumhala study abroad planning sathi kashi madat hava aahe?",
}

LANGUAGE_CONFIRMATION_RETURNING = {
    "en-IN": "Welcome back to Fateh Education. I am Priya, and we can continue from where we left off. Please tell me what you want help with today.",
    "hi-IN": "Fateh Education mein phir se swagat hai. Main Priya hoon, aur hum wahi se continue kar sakte hain. Aaj aapko kis cheez mein help chahiye?",
    "mr-IN": "Fateh Education madhye punha swagat aahe. Mi Priya aahe, ani apan jithe thamblo tithun pudhe jau. Aaj tumhala kontya goshtit madat hava aahe?",
}

NO_AUDIO = {
    "en-IN": "I could not hear anything clearly. Please speak again after the beep.",
    "hi-IN": "Mujhe aapki awaaz clear nahin mili. Kripya beep ke baad phir boliye.",
    "mr-IN": "Mala tumcha aawaz clear aikla nahi. Krupaya beep nantar punha bola.",
}

FALLBACK_REPLY = {
    "en-IN": "Thanks, I have noted that. A counsellor from Fateh Education will help you further. What else would you like to know?",
    "hi-IN": "Dhanyavaad, maine yeh note kar liya hai. Fateh Education ka counsellor aapko aage help karega. Aur aap kya jaana chahenge?",
    "mr-IN": "Dhanyavaad, mi he note kele aahe. Fateh Education cha counsellor tumhala pudhe madat karel. Aajun kay mahiti hava aahe?",
}

CLOSING_MESSAGE = {
    "en-IN": "Thank you for calling Fateh Education. Our counsellor will connect with you soon.",
    "hi-IN": "Fateh Education ko call karne ke liye dhanyavaad. Hamara counsellor aapse jald connect karega.",
    "mr-IN": "Fateh Education la call kelyabaddal dhanyavaad. Amcha counsellor tumchyashi lavkarach connect karel.",
}

PROCESSED_RECORDINGS: set[str] = set()


def _build_url(path: str) -> str:
    return f"{env.normalized_public_url()}{path}"


def _normalize_language(value: str | None) -> Language:
    if value in {"en-IN", "hi-IN", "mr-IN"}:
        return value
    return "en-IN"


def _remaining_budget(deadline_monotonic: float | None) -> float | None:
    if deadline_monotonic is None:
        return None
    return max(0.0, deadline_monotonic - time.monotonic())


def _log_turn_stage(call_sid: str, stage: str, t_start: float, deadline_monotonic: float | None) -> None:
    elapsed = time.monotonic() - t_start
    remaining = _remaining_budget(deadline_monotonic)
    remaining_str = "n/a" if remaining is None else f"{remaining:.2f}s"
    logger.info(f"/process-turn stage={stage} call_sid={call_sid} elapsed={elapsed:.2f}s remaining={remaining_str}")


def _twiml_response(response: VoiceResponse) -> FastAPIResponse:
    return FastAPIResponse(content=str(response), media_type="text/xml")


def _say(response: VoiceResponse, text: str, language: Language) -> None:
    response.say(text, language=language, voice=VOICE_BY_LANGUAGE[language])


def _append_record(response: VoiceResponse, language: Language) -> None:
    response.record(
        action=f"{_build_url('/webhooks/twilio/process-turn')}?lang={language}",
        method="POST",
        max_length=15,
        timeout=3,
        play_beep=True,
        trim="trim-silence",
        action_on_empty_result=True,
    )


def _remember_recording(recording_sid: str) -> bool:
    if not recording_sid:
        return True
    if recording_sid in PROCESSED_RECORDINGS:
        return False
    PROCESSED_RECORDINGS.add(recording_sid)
    asyncio.create_task(_expire_recording_sid(recording_sid))
    return True


async def _expire_recording_sid(recording_sid: str) -> None:
    await asyncio.sleep(env.TWILIO_RECORDING_DEDUPE_TTL_SEC)
    PROCESSED_RECORDINGS.discard(recording_sid)


async def _upsert_caller_for_inbound_call(phone: str, call_sid: str) -> tuple[dict, bool]:
    now = utc_now_iso()
    db = get_db()
    call_record = {
        "call_sid": call_sid,
        "started_at": now,
        "ended_at": None,
        "duration_seconds": None,
        "language": "en-IN",
        "turns": 0,
        "status": "active",
    }

    # _id is now the phone number
    existing = await db.callers.find_one({"_id": phone})
    if existing:
        await db.callers.update_one(
            {"_id": phone},
            {
                "$push": {"calls": call_record},
                "$set": {
                    "last_contact": now,
                    "updated_at": now,
                },
            },
        )
        updated = await db.callers.find_one({"_id": phone}) or {**existing, "calls": [*existing.get("calls", []), call_record]}
        return updated, True

    document = build_new_caller_document(phone, call_sid, now)
    await db.callers.insert_one(document)
    return document, False


async def _update_call_record(phone: str, call_sid: str, updates: dict) -> None:
    try:
        db = get_db()
        set_updates = {f"calls.$.{key}": value for key, value in updates.items()}
        set_updates["updated_at"] = utc_now_iso()
        await db.callers.update_one(
            {"_id": phone, "calls.call_sid": call_sid},
            {"$set": set_updates},
        )
    except Exception as exc:
        logger.error(f"Failed to update call record | phone={phone} call_sid={call_sid} err={repr(exc)}")


async def _handle_stt_failure(call_sid: str, language: Language) -> FastAPIResponse:
    state = ACTIVE_CALLS.get(call_sid)
    if state is None:
        response = VoiceResponse()
        _say(response, NO_AUDIO[language], language)
        _append_record(response, language)
        return _twiml_response(response)

    state.stt_failures += 1
    if state.stt_failures >= env.STT_REPROMPT_LIMIT:
        await _update_call_record(
            state.phone,
            call_sid,
            {"status": "dropped", "turns": state.turns, "language": language},
        )
        remove_state(call_sid)
        response = VoiceResponse()
        _say(response, CLOSING_MESSAGE[language], language)
        response.hangup()
        return _twiml_response(response)

    response = VoiceResponse()
    _say(response, NO_AUDIO[language], language)
    _append_record(response, language)
    return _twiml_response(response)


async def _reply_with_audio_or_say(
    call_sid: str,
    reply: str,
    language: Language,
    continue_call: bool,
    deadline_monotonic: float | None = None,
) -> FastAPIResponse:
    response = VoiceResponse()
    try:
        remaining = _remaining_budget(deadline_monotonic)
        if remaining is not None and remaining <= env.WEBHOOK_MIN_TTS_BUDGET_SEC:
            logger.warning(
                f"Skipping Sarvam TTS due to low webhook budget | call_sid={call_sid} remaining={remaining:.2f}s"
            )
            _say(response, reply, language)
        else:
            tts_timeout = None
            if remaining is not None:
                tts_timeout = max(0.2, remaining - env.WEBHOOK_TTS_BUDGET_GUARD_SEC)

            synthesize_kwargs = {}
            if env.TWILIO_WEBHOOK_FAST_DEADLINE_MODE:
                synthesize_kwargs = {
                    "max_key_attempts": 1,
                    "enable_speaker_fallback": bool(tts_timeout is None or tts_timeout >= 2.0),
                    "request_timeout_sec": tts_timeout,
                }

            if tts_timeout is not None:
                audio_bytes = await asyncio.wait_for(
                    synthesize_speech(reply, language, **synthesize_kwargs),
                    timeout=tts_timeout,
                )
            else:
                audio_bytes = await synthesize_speech(reply, language, **synthesize_kwargs)

            token = await cache_tts_audio(call_sid, audio_bytes)
            response.play(_build_url(f"/tts/{token}"))
    except asyncio.TimeoutError:
        logger.error(f"Sarvam TTS timed out in webhook budget, using Polly fallback | call_sid={call_sid}")
        _say(response, reply, language)
    except Exception as exc:
        logger.error(f"Sarvam TTS failed, using Polly fallback | call_sid={call_sid} err={repr(exc)}")
        _say(response, reply, language)

    if continue_call:
        _append_record(response, language)
    else:
        _say(response, CLOSING_MESSAGE[language], language)
        response.hangup()

    return _twiml_response(response)


@router.post("/voice")
async def voice(request: Request):
    try:
        await validate_twilio_signature(request)
        form = await request.form()

        call_sid = str(form.get("CallSid", ""))
        phone = normalize_phone(str(form.get("From", "")))

        caller_doc = {}
        is_returning_caller = False
        try:
            caller_doc, is_returning_caller = await _upsert_caller_for_inbound_call(phone, call_sid)
        except Exception as exc:
            logger.error(f"Failed to upsert caller on inbound call | phone={phone} call_sid={call_sid} err={repr(exc)}")
            caller_doc = build_new_caller_document(phone, call_sid, utc_now_iso())

        state = get_or_create_state(call_sid, phone)
        state.language = "en-IN"
        state.turns = 0
        state.stt_failures = 0
        state.call_history = []
        state.caller_doc = caller_doc
        state.is_returning_caller = is_returning_caller
        state.last_ai_reply = ""

        response = VoiceResponse()
        gather = Gather(
            num_digits=1,
            action=_build_url("/webhooks/twilio/language"),
            method="POST",
            timeout=6,
        )
        gather.say(WELCOME_PROMPT, language="en-IN", voice=VOICE_BY_LANGUAGE["en-IN"])
        response.append(gather)
        response.redirect(_build_url("/webhooks/twilio/voice"), method="POST")
        return _twiml_response(response)
    except Exception as exc:
        logger.error(f"/voice webhook failed | err={repr(exc)}")
        response = VoiceResponse()
        _say(response, CLOSING_MESSAGE["en-IN"], "en-IN")
        response.hangup()
        return _twiml_response(response)


@router.post("/language")
async def language(request: Request):
    try:
        await validate_twilio_signature(request)
        form = await request.form()

        call_sid = str(form.get("CallSid", ""))
        digit = str(form.get("Digits", "")).strip()
        selected_language = _normalize_language(LANGUAGE_BY_DIGIT.get(digit, "en-IN"))

        phone = normalize_phone(str(form.get("From", "")))
        state = ACTIVE_CALLS.get(call_sid) or get_or_create_state(call_sid, phone)
        state.language = selected_language

        confirmation_map = LANGUAGE_CONFIRMATION_RETURNING if state.is_returning_caller else LANGUAGE_CONFIRMATION_NEW
        await _update_call_record(
            state.phone,
            call_sid,
            {"language": selected_language, "status": "active", "turns": state.turns},
        )

        response = VoiceResponse()
        _say(response, confirmation_map[selected_language], selected_language)
        _append_record(response, selected_language)
        return _twiml_response(response)
    except Exception as exc:
        logger.error(f"/language webhook failed | err={repr(exc)}")
        response = VoiceResponse()
        _say(response, CLOSING_MESSAGE["en-IN"], "en-IN")
        response.hangup()
        return _twiml_response(response)


@router.post("/process-turn")
async def process_turn_webhook(request: Request, lang: str = Query(default="en-IN")):
    language = _normalize_language(lang)
    t_start = time.monotonic()
    deadline_monotonic = None
    if env.TWILIO_WEBHOOK_FAST_DEADLINE_MODE:
        deadline_monotonic = t_start + max(1.0, float(env.WEBHOOK_INTERNAL_BUDGET_SEC))

    try:
        await validate_twilio_signature(request)
        form = await request.form()

        call_sid = str(form.get("CallSid", ""))
        recording_url = str(form.get("RecordingUrl", ""))
        recording_sid = str(form.get("RecordingSid", "")).strip()
        phone = normalize_phone(str(form.get("From", "")))

        state = ACTIVE_CALLS.get(call_sid) or get_or_create_state(call_sid, phone)
        state.language = language
        _log_turn_stage(call_sid, "request_parsed", t_start, deadline_monotonic)

        if recording_sid and not _remember_recording(recording_sid):
            logger.warning(f"Duplicate Twilio recording ignored | call_sid={call_sid} recording_sid={recording_sid}")
            repeat_reply = state.last_ai_reply or NO_AUDIO[language]
            return await _reply_with_audio_or_say(
                call_sid,
                repeat_reply,
                language,
                continue_call=True,
                deadline_monotonic=deadline_monotonic,
            )

        if not recording_url:
            return await _handle_stt_failure(call_sid, language)

        remaining = _remaining_budget(deadline_monotonic)
        if remaining is not None and remaining <= 0.1:
            logger.warning(f"Webhook budget exhausted before recording download | call_sid={call_sid}")
            return await _reply_with_audio_or_say(
                call_sid,
                FALLBACK_REPLY[language],
                language,
                continue_call=True,
                deadline_monotonic=deadline_monotonic,
            )

        if remaining is not None:
            audio_bytes = await asyncio.wait_for(download_twilio_recording(recording_url), timeout=remaining)
        else:
            audio_bytes = await download_twilio_recording(recording_url)
        _log_turn_stage(call_sid, "recording_downloaded", t_start, deadline_monotonic)

        remaining = _remaining_budget(deadline_monotonic)
        if remaining is not None and remaining <= 0.1:
            logger.warning(f"Webhook budget exhausted before STT | call_sid={call_sid}")
            return await _reply_with_audio_or_say(
                call_sid,
                FALLBACK_REPLY[language],
                language,
                continue_call=True,
                deadline_monotonic=deadline_monotonic,
            )

        if remaining is not None:
            transcript = await asyncio.wait_for(transcribe_audio(audio_bytes, language), timeout=remaining)
        else:
            transcript = await transcribe_audio(audio_bytes, language)
        _log_turn_stage(call_sid, "stt_done", t_start, deadline_monotonic)

        if not transcript:
            return await _handle_stt_failure(call_sid, language)

        state.stt_failures = 0

        orchestrator_timeout = float(env.ORCHESTRATOR_TIMEOUT_SEC)
        remaining = _remaining_budget(deadline_monotonic)
        if remaining is not None:
            reserve_for_tts = max(env.WEBHOOK_MIN_TTS_BUDGET_SEC, env.WEBHOOK_TTS_BUDGET_GUARD_SEC)
            orchestrator_timeout = min(orchestrator_timeout, max(0.05, remaining - reserve_for_tts))

        try:
            if deadline_monotonic is not None and orchestrator_timeout <= env.WEBHOOK_MIN_ORCHESTRATOR_BUDGET_SEC:
                logger.warning(
                    f"Skipping orchestrator due to low webhook budget | call_sid={call_sid} timeout={orchestrator_timeout:.2f}s"
                )
                reply = FALLBACK_REPLY[language]
                updated_caller_doc = state.caller_doc
            else:
                reply, updated_caller_doc = await asyncio.wait_for(
                    process_turn(
                        phone=state.phone,
                        transcript=transcript,
                        language=language,
                        call_history=state.call_history,
                        call_sid=call_sid,
                        caller_doc=state.caller_doc,
                        is_returning_caller=state.is_returning_caller,
                        llm_time_budget_sec=orchestrator_timeout,
                    ),
                    timeout=orchestrator_timeout,
                )
        except asyncio.TimeoutError:
            logger.warning(f"Orchestrator timed out | call_sid={call_sid}")
            reply = FALLBACK_REPLY[language]
            updated_caller_doc = state.caller_doc
        except Exception as exc:
            logger.error(f"Turn orchestration failed | call_sid={call_sid} err={repr(exc)}")
            reply = FALLBACK_REPLY[language]
            updated_caller_doc = state.caller_doc
        _log_turn_stage(call_sid, "orchestrator_done", t_start, deadline_monotonic)

        state.turns += 1
        state.last_ai_reply = reply
        state.caller_doc = updated_caller_doc or state.caller_doc
        state.call_history.extend(
            [
                {"role": "user", "content": transcript},
                {"role": "assistant", "content": reply},
            ]
        )
        if len(state.call_history) > env.MAX_CONTEXT_MESSAGES:
            state.call_history = state.call_history[-env.MAX_CONTEXT_MESSAGES:]

        remaining = _remaining_budget(deadline_monotonic)
        if remaining is None or remaining > 0.4:
            await _update_call_record(
                state.phone,
                call_sid,
                {
                    "language": language,
                    "turns": state.turns,
                    "status": "active",
                },
            )
        else:
            logger.warning(
                f"Skipping call-record update due to low webhook budget | call_sid={call_sid} remaining={remaining:.2f}s"
            )

        if state.turns >= env.MAX_TURNS_PER_CALL:
            await _update_call_record(
                state.phone,
                call_sid,
                {
                    "language": language,
                    "turns": state.turns,
                    "status": "completed",
                },
            )
            remove_state(call_sid)
            response = await _reply_with_audio_or_say(
                call_sid,
                reply,
                language,
                continue_call=False,
                deadline_monotonic=deadline_monotonic,
            )
            _log_turn_stage(call_sid, "twiml_return", t_start, deadline_monotonic)
            return response

        response = await _reply_with_audio_or_say(
            call_sid,
            reply,
            language,
            continue_call=True,
            deadline_monotonic=deadline_monotonic,
        )
        _log_turn_stage(call_sid, "twiml_return", t_start, deadline_monotonic)
        return response
    except Exception as exc:
        elapsed = time.monotonic() - t_start
        remaining = _remaining_budget(deadline_monotonic)
        remaining_str = "n/a" if remaining is None else f"{remaining:.2f}s"
        logger.error(
            f"/process-turn webhook failed | lang={language} elapsed={elapsed:.2f}s remaining={remaining_str} err={repr(exc)}"
        )
        response = VoiceResponse()
        _say(response, FALLBACK_REPLY[language], language)
        _append_record(response, language)
        return _twiml_response(response)


async def _finalize_status_callback(form) -> None:
    call_sid = str(form.get("CallSid", ""))
    call_status = str(form.get("CallStatus", ""))
    duration = int(str(form.get("CallDuration", "0")) or 0)
    phone = normalize_phone(str(form.get("From", "")))

    if call_status not in {"completed", "no-answer", "busy", "failed", "canceled"}:
        return

    state = ACTIVE_CALLS.get(call_sid)
    effective_phone = state.phone if state else phone
    mapped_status = "completed" if call_status == "completed" else "no-answer" if call_status == "no-answer" else "dropped"
    if effective_phone:
        await _update_call_record(
            effective_phone,
            call_sid,
            {
                "ended_at": utc_now_iso(),
                "duration_seconds": duration,
                "status": mapped_status,
                "turns": state.turns if state else 0,
            },
        )
    remove_state(call_sid)


@router.post("/status")
@router.post("/voice/status")
async def status(request: Request):
    try:
        await validate_twilio_signature(request)
        form = await request.form()

        await _finalize_status_callback(form)
        return FastAPIResponse(status_code=200)
    except Exception as exc:
        logger.error(f"/status webhook failed | err={repr(exc)}")
        return FastAPIResponse(status_code=200)
