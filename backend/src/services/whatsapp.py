from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from twilio.rest import Client as TwilioClient

from src.config.env import env
from src.db.mongo_client import get_db
from src.utils.logger import logger


# ── Twilio WhatsApp client ──────────────────────────────────────────────
_twilio_client: TwilioClient | None = None


def _get_twilio_client() -> TwilioClient:
    global _twilio_client
    if _twilio_client is None:
        _twilio_client = TwilioClient(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
    return _twilio_client


def _whatsapp_from() -> str:
    """Twilio WhatsApp sender number (sandbox or registered)."""
    number = env.TWILIO_WHATSAPP_NUMBER or env.TWILIO_PHONE_NUMBER
    if not number.startswith("whatsapp:"):
        number = f"whatsapp:{number}"
    return number


def _whatsapp_to(phone: str) -> str:
    """Format the recipient phone for WhatsApp."""
    if phone.startswith("whatsapp:"):
        return phone
    return f"whatsapp:{phone}"


# ── Message formatting ──────────────────────────────────────────────────

LANGUAGE_LABELS = {
    "en-IN": "English",
    "hi-IN": "Hindi",
    "mr-IN": "Marathi",
}


def _format_call_report(caller_doc: Dict[str, Any], call_record: Dict[str, Any] | None) -> str:
    """Build a friendly WhatsApp summary of the call data collected."""
    lines: List[str] = []

    lines.append("📞 *Fateh Education — Call Summary*")
    lines.append("")

    # Call details
    if call_record:
        lang = LANGUAGE_LABELS.get(call_record.get("language", ""), call_record.get("language", "N/A"))
        duration = call_record.get("duration_seconds")
        turns = call_record.get("turns", 0)
        duration_str = f"{duration}s" if duration else "N/A"
        lines.append(f"🕐 Duration: {duration_str} | Turns: {turns} | Language: {lang}")
        lines.append("")

    lines.append("📋 *Your Profile Details:*")

    # Collected data
    field_map = [
        ("name", "👤 Name"),
        ("location", "📍 Location"),
        ("institution", "🎓 Institution"),
        ("education_level", "📚 Education Level"),
        ("field", "🔬 Field of Study"),
        ("target_countries", "🌍 Target Countries"),
        ("course_interest", "📖 Course Interest"),
        ("test_type", "📝 Test Type"),
        ("test_score", "📊 Test Score"),
        ("test_stage", "📋 Test Status"),
        ("budget_range", "💰 Budget"),
        ("intake_timing", "📅 Target Intake"),
        ("scholarship_interest", "🏆 Scholarship Interest"),
    ]

    has_data = False
    for field_key, label in field_map:
        value = caller_doc.get(field_key)
        if value and value not in ([], "not_started", "not_asked", "none", False):
            if isinstance(value, list):
                value = ", ".join(str(v) for v in value)
            elif isinstance(value, bool):
                value = "Yes" if value else "No"
            lines.append(f"{label}: {value}")
            has_data = True

    if not has_data:
        lines.append("No details collected yet — we'll gather more next time!")

    # Lead score
    lead_score = caller_doc.get("lead_score", 0)
    classification = caller_doc.get("classification", "Cold")
    if lead_score > 0:
        lines.append(f"\n🔥 Lead Score: {lead_score}/100 ({classification})")

    # Missing info note
    missing = []
    for key in ["name", "institution", "location", "education_level", "target_countries", "course_interest"]:
        val = caller_doc.get(key)
        if not val or val == [] or val == "not_started" or val == "not_asked":
            missing.append(key.replace("_", " ").title())

    if missing:
        lines.append(f"\nℹ️ Still needed: {', '.join(missing[:4])}")

    # Counselling session
    next_session = caller_doc.get("next_con_session")
    con_status = caller_doc.get("con_session_req", "none")
    if next_session and str(next_session).lower() != "none" and con_status in ("approved", "in_process"):
        lines.append(f"\n📅 *Counselling Session:* {next_session}")

    lines.append("")
    lines.append("Thank you for choosing Fateh Education! 🙏")
    lines.append("For any queries, call us anytime or reply to this message.")

    return "\n".join(lines)


def _format_session_reminder(caller_doc: Dict[str, Any]) -> str:
    """Build a WhatsApp reminder for an upcoming counselling session."""
    name = caller_doc.get("name", "Student")
    session_time = caller_doc.get("next_con_session", "")

    lines = [
        "🔔 *Fateh Education — Session Reminder*",
        "",
        f"Hi {name}! 👋",
        "",
        f"This is a friendly reminder about your upcoming counselling session scheduled for *{session_time}*.",
        "",
        "Our expert counsellor will help you with:",
        "• University shortlisting & applications",
        "• Visa guidance",
        "• Scholarship opportunities",
        "",
        "If you need to reschedule, please call us or reply to this message.",
        "",
        "See you soon! 🎓",
        "— Team Fateh Education",
    ]
    return "\n".join(lines)


# ── Sending logic ───────────────────────────────────────────────────────

async def _send_whatsapp_message(to_phone: str, body: str) -> bool:
    """Send a WhatsApp message via Twilio. Returns True on success."""
    try:
        client = _get_twilio_client()
        from_number = _whatsapp_from()
        to_number = _whatsapp_to(to_phone)

        # Run the synchronous Twilio SDK call in a thread pool
        loop = asyncio.get_event_loop()
        message = await loop.run_in_executor(
            None,
            lambda: client.messages.create(
                body=body,
                from_=from_number,
                to=to_number,
            ),
        )

        logger.info(
            f"WhatsApp message sent | to={to_phone} sid={message.sid} "
            f"status={message.status}"
        )
        return True
    except Exception as exc:
        logger.error(f"WhatsApp message failed | to={to_phone} err={repr(exc)}")
        return False


async def send_call_report(phone: str, call_sid: str) -> bool:
    """
    Fetch the caller document from MongoDB, find the matching call record,
    build a summary report, and send it via WhatsApp.
    """
    try:
        db = get_db()
        caller_doc = await db.callers.find_one({"_id": phone})
        if not caller_doc:
            logger.warning(f"WhatsApp report skipped — no caller found | phone={phone}")
            return False

        # Find the matching call record
        call_record = None
        for call in reversed(caller_doc.get("calls", [])):
            if call.get("call_sid") == call_sid:
                call_record = call
                break

        # Don't send if the call was too short (no meaningful data)
        turns = call_record.get("turns", 0) if call_record else 0
        if turns < 1:
            logger.info(f"WhatsApp report skipped — no turns in call | phone={phone} call_sid={call_sid}")
            return False

        report = _format_call_report(caller_doc, call_record)
        return await _send_whatsapp_message(phone, report)

    except Exception as exc:
        logger.error(f"WhatsApp call report failed | phone={phone} call_sid={call_sid} err={repr(exc)}")
        return False


async def send_session_reminder(phone: str) -> bool:
    """Send a counselling session reminder to the caller."""
    try:
        db = get_db()
        caller_doc = await db.callers.find_one({"_id": phone})
        if not caller_doc:
            logger.warning(f"WhatsApp reminder skipped — no caller found | phone={phone}")
            return False

        next_session = caller_doc.get("next_con_session")
        con_status = caller_doc.get("con_session_req", "none")
        if not next_session or str(next_session).lower() == "none" or con_status not in ("approved", "in_process"):
            logger.info(f"WhatsApp reminder skipped — no active session | phone={phone}")
            return False

        reminder = _format_session_reminder(caller_doc)
        return await _send_whatsapp_message(phone, reminder)

    except Exception as exc:
        logger.error(f"WhatsApp session reminder failed | phone={phone} err={repr(exc)}")
        return False


async def check_and_send_session_reminders() -> int:
    """
    Cron-style task: find all callers with upcoming sessions and send reminders.
    Returns count of reminders sent.
    """
    try:
        db = get_db()
        callers_with_sessions = db.callers.find({
            "con_session_req": {"$in": ["approved", "in_process"]},
            "next_con_session": {"$ne": None},
            "session_reminder_sent": {"$ne": True},
        })

        sent_count = 0
        async for caller in callers_with_sessions:
            phone = caller.get("_id", "")
            if not phone:
                continue

            success = await send_session_reminder(phone)
            if success:
                # Mark reminder as sent so we don't spam
                await db.callers.update_one(
                    {"_id": phone},
                    {"$set": {"session_reminder_sent": True}},
                )
                sent_count += 1

        if sent_count > 0:
            logger.info(f"Session reminders sent | count={sent_count}")
        return sent_count

    except Exception as exc:
        logger.error(f"Session reminder cron failed | err={repr(exc)}")
        return 0
