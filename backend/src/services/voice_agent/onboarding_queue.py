"""
Onboarding Queue Service
Manages the lifecycle of onboarding questions for each call session:
  - Pre-fetches and seeds questions at call start
  - Tracks which questions are pending / asked / answered
  - Persists answers progressively during the call
  - Emits Socket.IO events for live dashboard updates
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.db.supabase_client import supabase
from src.services.cache.redis_client import cache_get, cache_set
from src.services.rag.retriever import retrieve_kb
from src.services.transcription.live_stream import broadcast_onboarding_progress
from src.models.types import Language
from src.utils.logger import logger


# ── Hardcoded onboarding templates (always the same for first-time callers) ─

ONBOARDING_QUESTION_TEMPLATES: List[Dict[str, str]] = [
    {"key": "target_countries",  "text": "Which country are you thinking of — UK or Ireland?"},
    {"key": "education_level",   "text": "Are you finishing your bachelor's or already a graduate?"},
    {"key": "course_interest",   "text": "Which subject or course are you planning to study?"},
    {"key": "ielts_status",      "text": "Have you taken IELTS or PTE yet, or are you still preparing?"},
    {"key": "budget_range",      "text": "What budget range are you working with — roughly?"},
    {"key": "intake_timing",     "text": "Are you targeting September 2025 or January 2026?"},
    {"key": "scholarship",       "text": "Are you interested in exploring scholarships?"},
    {"key": "name",              "text": "Could I get your name so I can personalise this for you?"},
    {"key": "location",          "text": "Which city are you calling from?"},
    {"key": "field",             "text": "What's your academic background — engineering, business, science?"},
    {"key": "gpa",               "text": "What's your current GPA or percentage?"},
    {"key": "institution",       "text": "Which college or university are you studying or studied at?"},
]


LOCALIZED_TEMPLATES: Dict[str, Dict[str, str]] = {
    "hi-IN": {
        "target_countries":  "Aap UK ya Ireland mein padhna chahte hain?",
        "education_level":   "Aap abhi bachelor's kar rahe hain ya graduate hain?",
        "course_interest":   "Aap kaun sa subject ya course padhna chahte hain?",
        "ielts_status":      "Kya aapne IELTS ya PTE diya hai ya abhi preparation ho rahi hai?",
        "budget_range":      "Aapki budget range roughly kitni hai?",
        "intake_timing":     "September 2025 ya January 2026, kab start karna chahte hain?",
        "scholarship":       "Kya aap scholarship explore karna chahte hain?",
        "name":              "Aapka naam kya hai taaki main properly help kar sakun?",
        "location":          "Aap kis city se call kar rahe hain?",
        "field":             "Aapka academic background kya hai — engineering, business, science?",
        "gpa":               "Aapka current GPA ya percentage kitna hai?",
        "institution":       "Aap kaunse college ya university mein padh rahe hain?",
    },
    "mr-IN": {
        "target_countries":  "Tumhala UK ya Ireland madhe shikaycha ahe ka?",
        "education_level":   "Tumhi atta bachelor's karat aahat ka graduate aahat?",
        "course_interest":   "Kaun ta subject ya course shikaycha ahe?",
        "ielts_status":      "IELTS kinwa PTE dilat ka, ki ajun tayari chalu ahe?",
        "budget_range":      "Tumchi budget range sadharan kiti ahe?",
        "intake_timing":     "September 2025 ka January 2026, kevha start karaycha ahe?",
        "scholarship":       "Scholarship baghaychi aahe ka?",
        "name":              "Tumcha naav sanga mhanaje mala nit help karta yeil?",
        "location":          "Tumhi kuthun call karat aahat?",
        "field":             "Tumcha academic background kaay aahe — engineering, business, science?",
        "gpa":               "Tumcha current GPA kinwa percentage kiti aahe?",
        "institution":       "Tumhi kuthle college kinwa university madhe aahat?",
    },
    "en-IN": {t["key"]: t["text"] for t in ONBOARDING_QUESTION_TEMPLATES},
}


def _redis_queue_key(session_id: str) -> str:
    return f"onboarding:queue:{session_id}"


# ─── Core functions ──────────────────────────────────────


async def prefetch_and_seed_onboarding_questions(
    session_id: str,
    caller_phone: str,
    language: str = "en-IN",
) -> List[Dict[str, Any]]:
    """
    Called immediately after the session row is created in /voice.
    Seeds 12 onboarding questions and writes them to both Supabase and Redis.
    """
    try:
        # 1. Check if this is a returning caller
        templates = list(ONBOARDING_QUESTION_TEMPLATES)  # full copy

        try:
            existing = (
                supabase.table("leads")
                .select("id, counsellor_brief, data_completeness")
                .eq("phone", caller_phone)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if existing.data and len(existing.data) > 0:
                prev = existing.data[0]
                completeness = prev.get("data_completeness") or 0
                if completeness > 40:
                    # Returning caller: only seed missing fields
                    brief = prev.get("counsellor_brief") or {}
                    answered_keys = set()
                    if isinstance(brief, dict):
                        for q in brief.get("onboarding_queue", []):
                            if isinstance(q, dict) and q.get("status") == "answered":
                                answered_keys.add(q.get("question_key"))
                    templates = [t for t in templates if t["key"] not in answered_keys]
                    logger.info(
                        f"Returning caller detected | phone={caller_phone} "
                        f"prev_completeness={completeness}% seeding {len(templates)} questions"
                    )
        except Exception as exc:
            logger.warning(f"Failed to check returning caller | err={exc}")

        if not templates:
            logger.info(f"No new onboarding questions for session={session_id}")
            return []

        # 2. Fetch source_chunk_ids from KB concurrently
        kb_tasks = [retrieve_kb(t["text"], max_results=1) for t in templates]
        kb_results = await asyncio.gather(*kb_tasks, return_exceptions=True)

        # 3. Build rows for insertion
        now = datetime.now(timezone.utc).isoformat()
        rows: List[Dict[str, Any]] = []
        for i, template in enumerate(templates):
            source_chunk_id = None
            kb_result = kb_results[i] if i < len(kb_results) else None
            if isinstance(kb_result, list) and len(kb_result) > 0:
                source_chunk_id = kb_result[0].id if kb_result[0].id else None

            rows.append({
                "session_id":      session_id,
                "question_key":    template["key"],
                "question_text":   template["text"],
                "status":          "pending",
                "source_chunk_id": source_chunk_id,
                "created_at":      now,
            })

        # 4. Bulk insert into Supabase
        try:
            supabase.table("onboarding_questions").insert(rows).execute()
            logger.info(f"Seeded {len(rows)} onboarding questions | session_id={session_id}")
        except Exception as exc:
            logger.error(f"Failed to seed onboarding questions | session_id={session_id} err={exc}")

        # 5. Update leads counsellor_brief
        try:
            queue_summary = [
                {"question_key": r["question_key"], "question_text": r["question_text"], "status": "pending"}
                for r in rows
            ]
            supabase.table("leads").update({
                "counsellor_brief": {"onboarding_queue": queue_summary},
            }).eq("session_id", session_id).execute()
        except Exception as exc:
            logger.warning(f"Failed to update counsellor_brief with queue | err={exc}")

        # 6. Cache pending keys in Redis
        pending_keys = [r["question_key"] for r in rows]
        await cache_set(_redis_queue_key(session_id), pending_keys, ttl_seconds=3600)

        return rows

    except Exception as exc:
        logger.error(f"prefetch_and_seed_onboarding_questions failed | session_id={session_id} err={exc}")
        return []


async def get_pending_questions(session_id: str) -> List[str]:
    """Return list of question keys still pending from Redis cache."""
    cached = await cache_get(_redis_queue_key(session_id))
    return cached if isinstance(cached, list) else []


async def mark_question_answered(
    session_id: str,
    question_key: str,
    answer: str,
    turn_number: int,
) -> None:
    """
    Mark a specific question as answered.
    Updates Supabase AND the Redis cache atomically.
    """
    now = datetime.now(timezone.utc).isoformat()

    # Update DB row
    try:
        supabase.table("onboarding_questions").update({
            "status":      "answered",
            "answer":      answer[:500],
            "answered_at": now,
            "turn_number": turn_number,
        }).eq("session_id", session_id).eq("question_key", question_key).execute()
    except Exception as exc:
        logger.error(f"Failed to mark question answered | key={question_key} err={exc}")

    # Remove from Redis pending list
    pending = await get_pending_questions(session_id)
    pending = [k for k in pending if k != question_key]
    await cache_set(_redis_queue_key(session_id), pending, ttl_seconds=3600)

    # Emit Socket.IO event for live dashboard update
    await broadcast_onboarding_progress(session_id, {
        "question_key": question_key,
        "status": "answered",
        "answer": answer[:500],
        "turn_number": turn_number,
    })


async def mark_question_asked(
    session_id: str,
    question_key: str,
    turn_number: int,
) -> None:
    """Mark a question as asked (waiting for student answer)."""
    try:
        supabase.table("onboarding_questions").update({
            "status":   "asked",
            "asked_at": datetime.now(timezone.utc).isoformat(),
            "turn_number": turn_number,
        }).eq("session_id", session_id).eq("question_key", question_key).execute()
    except Exception as exc:
        logger.error(f"Failed to mark question asked | key={question_key} err={exc}")

    await broadcast_onboarding_progress(session_id, {
        "question_key": question_key,
        "status": "asked",
        "turn_number": turn_number,
    })


async def localize_question_texts(session_id: str, language: str) -> None:
    """Update question_text column for all pending rows to match selected language."""
    lang_templates = LOCALIZED_TEMPLATES.get(language, LOCALIZED_TEMPLATES["en-IN"])
    for key, text in lang_templates.items():
        try:
            supabase.table("onboarding_questions").update(
                {"question_text": text}
            ).eq("session_id", session_id).eq("question_key", key).execute()
        except Exception as exc:
            logger.warning(f"Failed to localize question | key={key} lang={language} err={exc}")



