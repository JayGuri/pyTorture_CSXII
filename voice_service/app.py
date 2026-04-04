from __future__ import annotations

import json
import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import requests
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response

from voice_service.analysis import analyze_transcript
from voice_service.config import get_settings
from voice_service.sarvam_client import SarvamClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Fateh Voice Service", version="1.0.0")
settings = get_settings()
sarvam = SarvamClient(settings)

CALL_STATE: dict[str, dict[str, Any]] = {}
LOG_FILE = Path(__file__).parent / "data" / "call_analytics.jsonl"

LANGUAGE_BY_DIGIT = {
    "1": "en-IN",
    "2": "hi-IN",
    "3": "mr-IN",
}

WELCOME_PROMPT = (
    "Welcome to Fateh Education AI assistant. "
    "Press 1 for English. Press 2 for Hindi. Press 3 for Marathi."
)

LANGUAGE_CONFIRMATION = {
    "en-IN": "You selected English. Please tell me your question after the beep.",
    "hi-IN": "Aapne Hindi chuna hai. Kripya beep ke baad apna sawaal batayiye.",
    "mr-IN": "तुम्ही मराठी निवडली आहे. कृपया बीपनंतर तुमचा प्रश्न सांगा.",
}

FOLLOW_UP_PROMPT = {
    "en-IN": "You can ask your next question after the beep.",
    "hi-IN": "Beep ke baad aap apna agla sawaal puch sakte hain.",
    "mr-IN": "बीपनंतर तुम्ही पुढचा प्रश्न विचारू शकता.",
}

NO_AUDIO_PROMPT = {
    "en-IN": "I could not hear any audio. Please speak again after the beep.",
    "hi-IN": "Mujhe aapki awaaz clear nahi mili. Kripya beep ke baad phir boliye.",
    "mr-IN": "मला तुमचा आवाज स्पष्ट ऐकू आला नाही. कृपया पुन्हा बोला.",
}

FALLBACK_REPLY = {
    "en-IN": "Thanks, I captured your query. A counsellor-focused summary has been prepared.",
    "hi-IN": "Dhanyavaad, maine aapka sawaal capture kar liya hai. Counsellor ke liye summary taiyaar hai.",
    "mr-IN": "धन्यवाद, मी तुमचा प्रश्न नोंदवला आहे. काउन्सेलरसाठी सारांश तयार आहे.",
}

CLOSE_PROMPT = {
    "en-IN": "Thanks for calling Fateh Education. Our counsellor will connect with you soon.",
    "hi-IN": "Fateh Education ko call karne ke liye dhanyavaad. Hamara counsellor jald aapse sampark karega.",
    "mr-IN": "Fateh Education ला कॉल केल्याबद्दल धन्यवाद. आमचा काउन्सेलर लवकरच संपर्क करेल.",
}


@app.get("/")
def root() -> JSONResponse:
    return JSONResponse(
        {
            "service": "fateh-voice-service",
            "status": "running",
            "endpoints": ["/health", "/twilio/voice", "/twilio/language", "/twilio/process-recording"],
        }
    )


@app.get("/health")
def health() -> JSONResponse:
    return JSONResponse({"ok": True, "timestamp": datetime.now(timezone.utc).isoformat()})


def _build_url(path: str, query: dict[str, str] | None = None) -> str:
    base = f"{settings.base_url}{path}"
    if not query:
        return base
    return f"{base}?{urlencode(query)}"


def _new_twiml() -> ET.Element:
    return ET.Element("Response")


def _add_say(root: ET.Element, text: str, language_code: str) -> None:
    attrs = {"language": language_code, "voice": "Polly.Aditi"}
    say = ET.SubElement(root, "Say", attrs)
    say.text = text


def _add_record(root: ET.Element, language_code: str) -> None:
    ET.SubElement(
        root,
        "Record",
        {
            "action": _build_url("/twilio/process-recording", {"lang": language_code}),
            "method": "POST",
            "maxLength": "25",
            "timeout": "3",
            "playBeep": "true",
            "trim": "trim-silence",
            "actionOnEmptyResult": "true",
        },
    )


def _add_redirect(root: ET.Element, url: str) -> None:
    redirect = ET.SubElement(root, "Redirect", {"method": "POST"})
    redirect.text = url


def _add_hangup(root: ET.Element) -> None:
    ET.SubElement(root, "Hangup")


def _add_language_gather(root: ET.Element) -> None:
    gather = ET.SubElement(
        root,
        "Gather",
        {
            "numDigits": "1",
            "action": _build_url("/twilio/language"),
            "method": "POST",
            "timeout": "6",
        },
    )
    _add_say(gather, WELCOME_PROMPT, "en-IN")


def _xml_response(root: ET.Element) -> Response:
    payload = ET.tostring(root, encoding="unicode")
    return Response(content=payload, media_type="application/xml")


def _download_recording(recording_url: str) -> bytes:
    final_url = recording_url if recording_url.endswith(".wav") else f"{recording_url}.wav"

    auth = None
    if settings.twilio_account_sid and settings.twilio_auth_token:
        auth = (settings.twilio_account_sid, settings.twilio_auth_token)

    response = requests.get(final_url, auth=auth, timeout=settings.http_timeout_sec)
    response.raise_for_status()
    return response.content


def _append_log(entry: dict[str, Any]) -> None:
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


def _next_record(root: ET.Element, language_code: str) -> None:
    _add_say(root, FOLLOW_UP_PROMPT.get(language_code, FOLLOW_UP_PROMPT["en-IN"]), language_code)
    _add_record(root, language_code)


def _fallback_reply(language_code: str) -> str:
    return FALLBACK_REPLY.get(language_code, FALLBACK_REPLY["en-IN"])


@app.post("/twilio/voice")
async def twilio_voice() -> Response:
    root = _new_twiml()
    _add_language_gather(root)
    _add_redirect(root, _build_url("/twilio/voice"))
    return _xml_response(root)


@app.post("/twilio/language")
async def twilio_language(request: Request) -> Response:
    form = await request.form()
    digits = str(form.get("Digits", "")).strip()
    call_sid = str(form.get("CallSid", "")).strip()

    language_code = LANGUAGE_BY_DIGIT.get(digits, "en-IN")
    CALL_STATE.setdefault(call_sid, {"turns": 0})["language"] = language_code

    root = _new_twiml()
    _add_say(root, LANGUAGE_CONFIRMATION.get(language_code, LANGUAGE_CONFIRMATION["en-IN"]), language_code)
    _add_record(root, language_code)
    return _xml_response(root)


@app.post("/twilio/process-recording")
async def process_recording(request: Request, lang: str = "en-IN") -> Response:
    form = await request.form()
    call_sid = str(form.get("CallSid", "")).strip()
    recording_url = str(form.get("RecordingUrl", "")).strip()

    state = CALL_STATE.setdefault(call_sid, {"language": lang, "turns": 0})
    state["language"] = lang

    root = _new_twiml()

    if not recording_url:
        _add_say(root, NO_AUDIO_PROMPT.get(lang, NO_AUDIO_PROMPT["en-IN"]), lang)
        _next_record(root, lang)
        return _xml_response(root)

    transcript = ""
    analysis: dict[str, Any] = {}
    ai_reply = ""
    error_message = ""

    try:
        audio_bytes = _download_recording(recording_url)
        transcript = sarvam.transcribe_audio(audio_bytes, language_code=lang)
        if not transcript:
            transcript = ""

        analysis = analyze_transcript(transcript=transcript, language_code=lang)

        if transcript:
            ai_reply = sarvam.generate_reply(transcript, language_code=lang, analysis=analysis)
    except Exception as exc:
        error_message = str(exc)
        logger.exception("Failed processing recording for call %s", call_sid)

    if not ai_reply:
        ai_reply = _fallback_reply(lang)

    state["turns"] = int(state.get("turns", 0)) + 1

    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "call_sid": call_sid,
        "language": lang,
        "recording_url": recording_url,
        "transcript": transcript,
        "analysis": analysis,
        "reply": ai_reply,
        "turn": state["turns"],
        "error": error_message,
    }
    _append_log(log_entry)

    _add_say(root, ai_reply, lang)

    if state["turns"] >= settings.max_turns_per_call:
        _add_say(root, CLOSE_PROMPT.get(lang, CLOSE_PROMPT["en-IN"]), lang)
        _add_hangup(root)
    else:
        _next_record(root, lang)

    return _xml_response(root)
