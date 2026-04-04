from __future__ import annotations

import time
from typing import Any, Dict, List, Tuple

from src.db.mongo_client import get_db
from src.services.llm import generate_reply_with_fallback
from src.services.voice_agent.extractor import (
    build_extraction_prompt,
    extract_updates,
    merge_extractions,
    parse_llm_extraction,
)
from src.services.voice_agent.memory import build_context_for_llm, load_memory, save_turn
from src.services.voice_agent.prompt_builder import build_system_prompt
from src.services.voice_agent.scorer import score_lead
from src.utils.helpers import utc_now_iso
from src.utils.logger import logger

FALLBACK_REPLIES = {
    "en-IN": "I am sorry, I had a brief issue there. Could you please repeat that for me?",
    "hi-IN": "Maaf kijiye, thoda issue ho gaya tha. Kya aap ek baar phir bata sakte hain?",
    "mr-IN": "Maaf kara, thoda issue zala hota. Krupaya ekda punha sanga shakal ka?",
}


async def _llm_extract(
    transcript: str,
    ai_reply: str,
    existing_doc: Dict[str, Any],
    llm_time_budget_sec: float | None = None,
) -> Dict[str, Any]:
    """Use the routed LLM providers to extract structured fields from a turn."""
    prompt = build_extraction_prompt(transcript, ai_reply, existing_doc)
    if not prompt:
        return {}

    try:
        raw, _ = await generate_reply_with_fallback(
            prompt,
            [{"role": "user", "content": "Extract the fields."}],
            llm_time_budget_sec=llm_time_budget_sec,
            request_label="extraction",
        )
        if not raw:
            return {}
        return parse_llm_extraction(raw)
    except Exception as exc:
        logger.warning(f"LLM extraction failed (non-critical) | err={repr(exc)}")
        return {}


async def process_turn(
    phone: str,
    transcript: str,
    language: str,
    call_history: List[Dict[str, str]],
    call_sid: str,
    caller_doc: Dict[str, Any] | None = None,
    is_returning_caller: bool = False,
    llm_time_budget_sec: float | None = None,
) -> Tuple[str, Dict[str, Any]]:
    db = None
    current_doc = dict(caller_doc or {})

    try:
        db = get_db()
        if not current_doc:
            current_doc = await db.callers.find_one({"_id": phone}) or {}
    except Exception as exc:
        logger.error(f"Failed to load caller from MongoDB | phone={phone} err={repr(exc)}")

    try:
        memory = await load_memory(phone)
        context_messages = build_context_for_llm(memory, call_history)
    except Exception as exc:
        logger.error(f"Failed to build memory context | phone={phone} err={repr(exc)}")
        memory = {
            "messages": [],
            "summary": None,
            "topics_discussed": [],
        }
        context_messages = list(call_history)

    context_messages.append({"role": "user", "content": transcript})
    system_prompt = build_system_prompt(
        caller_doc=current_doc,
        language=language,
        topics_discussed=memory.get("topics_discussed", []),
        is_returning_caller=is_returning_caller,
    )

    turn_started = time.monotonic()

    def _remaining_llm_budget_sec() -> float | None:
        if llm_time_budget_sec is None:
            return None
        return max(0.0, float(llm_time_budget_sec) - (time.monotonic() - turn_started))

    reply, provider_used = await generate_reply_with_fallback(
        system_prompt,
        context_messages,
        llm_time_budget_sec=_remaining_llm_budget_sec(),
        request_label="main_reply",
    )
    logger.info(f"LLM provider selected | call_sid={call_sid} provider={provider_used}")

    if not reply:
        reply = FALLBACK_REPLIES.get(language, FALLBACK_REPLIES["en-IN"])

    merged_doc = dict(current_doc)

    try:
        # Step 1: Fast regex extraction
        regex_updates = extract_updates(transcript, current_doc)

        # Step 2: LLM-powered extraction (uses transcript + AI reply for richer context)
        llm_updates = await _llm_extract(
            transcript,
            reply,
            current_doc,
            llm_time_budget_sec=_remaining_llm_budget_sec(),
        )

        # Step 3: Merge — LLM takes priority for complex fields
        extracted_updates = merge_extractions(regex_updates, llm_updates)
        merged_doc.update(extracted_updates)

        score_updates = score_lead(merged_doc)
        merged_doc.update(score_updates)

        now = utc_now_iso()
        topics = _detect_topics(transcript)

        if db is not None and phone:
            await db.callers.update_one(
                {"_id": phone},
                {
                    "$set": {
                        **extracted_updates,
                        **score_updates,
                        "updated_at": now,
                        "last_contact": now,
                    }
                },
                upsert=False,
            )

        await save_turn(phone, transcript, reply, topics)
        merged_doc.update(
            {
                **extracted_updates,
                **score_updates,
                "updated_at": now,
                "last_contact": now,
            }
        )
        logger.info(
            f"Turn processed | call_sid={call_sid} phone={phone} "
            f"new_fields={list(extracted_updates.keys())} score={merged_doc.get('lead_score', 0)}"
        )
    except Exception as exc:
        logger.error(f"Post-reply caller update failed | phone={phone} call_sid={call_sid} err={repr(exc)}")

    return reply, merged_doc


def _detect_topics(transcript: str) -> List[str]:
    lower_text = transcript.lower()
    topics: List[str] = []
    if any(word in lower_text for word in ["visa", "ukvi", "ihs", "immigration"]):
        topics.append("visa")
    if any(word in lower_text for word in ["fee", "cost", "lakh", "budget", "afford"]):
        topics.append("cost")
    if any(word in lower_text for word in ["ielts", "pte", "toefl", "score", "band"]):
        topics.append("test_status")
    if any(word in lower_text for word in ["scholarship", "chevening", "funding"]):
        topics.append("scholarship")
    if any(word in lower_text for word in ["course", "msc", "mba", "program", "degree"]):
        topics.append("course")
    if any(word in lower_text for word in ["university", "college", "rank", "admission"]):
        topics.append("university")
    if any(word in lower_text for word in ["ireland", "dublin", "ucd", "tcd"]):
        topics.append("ireland")
    if any(word in lower_text for word in ["work", "part-time", "graduate route", "stamp 1g", "psw"]):
        topics.append("post_study_work")
    if any(word in lower_text for word in ["counselling", "counsellor", "session", "appointment", "meeting"]):
        topics.append("counselling_session")
    return topics
