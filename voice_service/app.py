from __future__ import annotations

from collections import Counter
import json
import logging
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import requests
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, Response

from voice_service.analysis import analyze_transcript
from voice_service.config import get_settings
from voice_service.sarvam_client import SarvamClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Fateh Voice Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings = get_settings()
sarvam = SarvamClient(settings)

CALL_STATE: dict[str, dict[str, Any]] = {}
LOG_FILE = Path(__file__).parent / "data" / "call_analytics.jsonl"

LANGUAGE_BY_DIGIT = {
    "1": "en-IN",
    "2": "hi-IN",
    "3": "mr-IN",
}

LANGUAGE_NAME = {
    "en-IN": "English",
    "hi-IN": "Hindi",
    "mr-IN": "Marathi",
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
            "endpoints": [
                "/health",
                "/twilio/voice",
                "/twilio/language",
                "/twilio/process-recording",
                "/api/calls",
                "/api/calls/{call_sid}",
                "/api/calls/{call_sid}/transcript.txt",
                "/api/calls/{call_sid}/summary/regenerate",
            ],
        }
    )


@app.get("/health")
def health() -> JSONResponse:
    return JSONResponse({"ok": True, "timestamp": datetime.now(timezone.utc).isoformat()})


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_call_state(call_sid: str, language_code: str = "en-IN") -> dict[str, Any]:
    call_sid = call_sid.strip()
    now = _now_iso()

    if call_sid not in CALL_STATE:
        CALL_STATE[call_sid] = {
            "call_sid": call_sid,
            "language": language_code,
            "status": "active",
            "turns": 0,
            "started_at": now,
            "updated_at": now,
            "from_number": "",
            "to_number": "",
            "segments": [],
            "summary_report": None,
        }

    state = CALL_STATE[call_sid]
    state["language"] = language_code
    state["updated_at"] = now
    return state


def _conversation_text(state: dict[str, Any]) -> str:
    lines: list[str] = []
    segments = state.get("segments", [])
    for segment in segments:
        turn = segment.get("turn", "?")
        transcript = segment.get("transcript", "")
        reply = segment.get("reply", "")
        if transcript:
            lines.append(f"Caller (Turn {turn}): {transcript}")
        if reply:
            lines.append(f"Assistant (Turn {turn}): {reply}")
    return "\n".join(lines)


def _extract_json_block(raw_text: str) -> dict[str, Any] | None:
    text = raw_text.strip()
    if not text:
        return None

    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None

    try:
        parsed = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def _fallback_next_steps(intents: list[str]) -> list[str]:
    default_steps = [
        "Shortlist 3 target universities based on budget and profile.",
        "Check intake deadlines and document requirements this week.",
        "Book a counsellor follow-up call for application planning.",
    ]

    intent_to_steps = {
        "visa_inquiry": "Prepare visa funds proof plan and required documents checklist.",
        "cost_inquiry": "Create a budget split for tuition, living costs, and visa expenses.",
        "scholarship_inquiry": "Collect scholarship deadlines and eligibility criteria before applying.",
        "test_inquiry": "Schedule IELTS/PTE exam and set a preparation target date.",
        "university_inquiry": "Compare admissions criteria for shortlisted universities.",
        "timeline_inquiry": "Set a week-by-week application timeline until intake deadline.",
    }

    generated: list[str] = []
    for intent in intents:
        step = intent_to_steps.get(intent)
        if step and step not in generated:
            generated.append(step)

    if not generated:
        return default_steps

    return generated[:4]


def _fallback_summary_report(state: dict[str, Any]) -> dict[str, Any]:
    segments = state.get("segments", [])
    intents: list[str] = []
    sentiments = Counter()

    for segment in segments:
        analysis = segment.get("analysis", {})
        intent = analysis.get("intent", "general_query")
        sentiment = analysis.get("sentiment", "neutral")
        intents.append(intent)
        sentiments[sentiment] += 1

    top_intents = [intent for intent, _ in Counter(intents).most_common(3)]
    key_points = [
        segment.get("transcript", "")
        for segment in segments
        if segment.get("transcript", "")
    ][:4]

    return {
        "title": "Conversation Summary",
        "overview": "Call summary generated from transcript signals and detected intent patterns.",
        "language": LANGUAGE_NAME.get(state.get("language", "en-IN"), "Unknown"),
        "total_turns": len(segments),
        "detected_intents": top_intents,
        "sentiment_breakdown": dict(sentiments),
        "key_points": key_points,
        "next_steps": _fallback_next_steps(top_intents),
        "action_items": [
            {
                "owner": "Student",
                "task": _fallback_next_steps(top_intents)[0],
                "priority": "High",
            },
            {
                "owner": "Fateh Counsellor",
                "task": "Review transcript and prepare customized university shortlist.",
                "priority": "High",
            },
        ],
    }


def _generate_summary_report(state: dict[str, Any], force_refresh: bool = False) -> dict[str, Any]:
    if not force_refresh and state.get("summary_report"):
        return state["summary_report"]

    ai_report: dict[str, Any] | None = None
    transcript = _conversation_text(state)

    if transcript:
        try:
            raw_report = sarvam.generate_call_summary(transcript=transcript, language_code=state.get("language", "en-IN"))
            ai_report = _extract_json_block(raw_report)
        except Exception:
            logger.exception("Failed to generate AI summary for call %s", state.get("call_sid", "unknown"))

    report = ai_report if ai_report else _fallback_summary_report(state)
    report["generated_at"] = _now_iso()
    report["call_sid"] = state.get("call_sid", "")
    report["status"] = state.get("status", "active")

    state["summary_report"] = report
    return report


def _build_transcript_file(state: dict[str, Any]) -> str:
    lines = [
        f"Call SID: {state.get('call_sid', '')}",
        f"Language: {LANGUAGE_NAME.get(state.get('language', 'en-IN'), state.get('language', 'Unknown'))}",
        f"Status: {state.get('status', 'active')}",
        f"Started: {state.get('started_at', '')}",
        f"Updated: {state.get('updated_at', '')}",
        "",
        "TRANSCRIPT",
        "----------",
    ]

    segments = state.get("segments", [])
    for segment in segments:
        turn = segment.get("turn", "?")
        timestamp = segment.get("timestamp", "")
        transcript = segment.get("transcript", "")
        reply = segment.get("reply", "")

        lines.append(f"[{timestamp}] Turn {turn}")
        lines.append(f"Caller: {transcript}")
        lines.append(f"Assistant: {reply}")
        lines.append("")

    summary = _generate_summary_report(state)
    lines.append("SUMMARY REPORT")
    lines.append("--------------")
    lines.append(json.dumps(summary, ensure_ascii=False, indent=2))
    lines.append("")

    return "\n".join(lines)


def _call_list_item(state: dict[str, Any]) -> dict[str, Any]:
    segments = state.get("segments", [])
    last_segment = segments[-1] if segments else {}
    preview = str(last_segment.get("transcript", "") or "")[:120]
    return {
        "call_sid": state.get("call_sid", ""),
        "status": state.get("status", "active"),
        "language": state.get("language", "en-IN"),
        "turns": state.get("turns", 0),
        "started_at": state.get("started_at", ""),
        "updated_at": state.get("updated_at", ""),
        "preview": preview,
    }


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
async def twilio_voice(request: Request) -> Response:
    form = await request.form()
    call_sid = str(form.get("CallSid", "")).strip()
    from_number = str(form.get("From", "")).strip()
    to_number = str(form.get("To", "")).strip()

    if call_sid:
        state = _ensure_call_state(call_sid)
        state["status"] = "active"
        if from_number:
            state["from_number"] = from_number
        if to_number:
            state["to_number"] = to_number

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
    if call_sid:
        state = _ensure_call_state(call_sid, language_code)
        state["status"] = "active"

    root = _new_twiml()
    _add_say(root, LANGUAGE_CONFIRMATION.get(language_code, LANGUAGE_CONFIRMATION["en-IN"]), language_code)
    _add_record(root, language_code)
    return _xml_response(root)


@app.post("/twilio/process-recording")
async def process_recording(request: Request, lang: str = "en-IN") -> Response:
    form = await request.form()
    call_sid = str(form.get("CallSid", "")).strip()
    recording_url = str(form.get("RecordingUrl", "")).strip()
    from_number = str(form.get("From", "")).strip()
    to_number = str(form.get("To", "")).strip()

    if not call_sid:
        call_sid = f"unknown-{int(datetime.now(timezone.utc).timestamp())}"

    state = _ensure_call_state(call_sid, lang)
    if from_number:
        state["from_number"] = from_number
    if to_number:
        state["to_number"] = to_number
    state["status"] = "active"

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
    state["updated_at"] = _now_iso()

    segment = {
        "timestamp": _now_iso(),
        "turn": state["turns"],
        "language": lang,
        "recording_url": recording_url,
        "transcript": transcript,
        "analysis": analysis,
        "reply": ai_reply,
        "error": error_message,
    }
    state.setdefault("segments", []).append(segment)
    state["summary_report"] = None

    log_entry = {
        "timestamp": _now_iso(),
        "call_sid": call_sid,
        "language": lang,
        "recording_url": recording_url,
        "transcript": transcript,
        "analysis": analysis,
        "reply": ai_reply,
        "turn": state["turns"],
        "status": state.get("status", "active"),
        "error": error_message,
    }
    _append_log(log_entry)

    _add_say(root, ai_reply, lang)

    if state["turns"] >= settings.max_turns_per_call:
        state["status"] = "completed"
        _generate_summary_report(state, force_refresh=True)
        _add_say(root, CLOSE_PROMPT.get(lang, CLOSE_PROMPT["en-IN"]), lang)
        _add_hangup(root)
    else:
        state["status"] = "active"
        _next_record(root, lang)

    return _xml_response(root)


@app.get("/api/calls")
def list_calls() -> JSONResponse:
    ordered = sorted(CALL_STATE.values(), key=lambda row: row.get("updated_at", ""), reverse=True)
    payload = [_call_list_item(state) for state in ordered]
    return JSONResponse({"calls": payload})


@app.get("/api/calls/{call_sid}")
def get_call(call_sid: str) -> JSONResponse:
    state = CALL_STATE.get(call_sid)
    if not state:
        raise HTTPException(status_code=404, detail="Call not found")

    if state.get("segments"):
        _generate_summary_report(state)

    payload = json.loads(json.dumps(state))
    payload["language_label"] = LANGUAGE_NAME.get(payload.get("language", "en-IN"), "Unknown")
    return JSONResponse(payload)


@app.get("/api/calls/{call_sid}/summary")
def get_call_summary(call_sid: str) -> JSONResponse:
    state = CALL_STATE.get(call_sid)
    if not state:
        raise HTTPException(status_code=404, detail="Call not found")

    summary = _generate_summary_report(state)
    return JSONResponse({"call_sid": call_sid, "summary_report": summary})


@app.post("/api/calls/{call_sid}/summary/regenerate")
def regenerate_summary(call_sid: str) -> JSONResponse:
    state = CALL_STATE.get(call_sid)
    if not state:
        raise HTTPException(status_code=404, detail="Call not found")

    summary = _generate_summary_report(state, force_refresh=True)
    return JSONResponse({"call_sid": call_sid, "summary_report": summary})


@app.get("/api/calls/{call_sid}/transcript.txt")
def download_transcript(call_sid: str) -> PlainTextResponse:
    state = CALL_STATE.get(call_sid)
    if not state:
        raise HTTPException(status_code=404, detail="Call not found")

    body = _build_transcript_file(state)
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", call_sid)
    headers = {
        "Content-Disposition": f'attachment; filename="{safe_name}_transcript.txt"',
    }
    return PlainTextResponse(content=body, headers=headers)
