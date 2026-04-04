from __future__ import annotations

from typing import Any, Dict, List, Tuple

from src.db.mongo_client import get_db
from src.services.llm.gemini import generate_reply
from src.services.voice_agent.extractor import extract_updates
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


async def process_turn(
    phone: str,
    transcript: str,
    language: str,
    call_history: List[Dict[str, str]],
    call_sid: str,
    caller_doc: Dict[str, Any] | None = None,
    is_returning_caller: bool = False,
) -> Tuple[str, Dict[str, Any]]:
    db = None
    current_doc = dict(caller_doc or {})

    try:
        db = get_db()
        if not current_doc:
            current_doc = await db.callers.find_one({"phone": phone}) or {}
    except Exception as exc:
        logger.error(f"Failed to load caller from MongoDB | phone={phone} err={exc}")

    try:
        memory = await load_memory(phone)
        context_messages = build_context_for_llm(memory, call_history)
    except Exception as exc:
        logger.error(f"Failed to build memory context | phone={phone} err={exc}")
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

    reply = await generate_reply(system_prompt, context_messages)
    if not reply:
        reply = FALLBACK_REPLIES.get(language, FALLBACK_REPLIES["en-IN"])

    merged_doc = dict(current_doc)

    try:
        extracted_updates = extract_updates(transcript, current_doc)
        merged_doc.update(extracted_updates)

        score_updates = score_lead(merged_doc)
        merged_doc.update(score_updates)

        now = utc_now_iso()
        topics = _detect_topics(transcript)

        if db is not None and phone:
            await db.callers.update_one(
                {"phone": phone},
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
        logger.error(f"Post-reply caller update failed | phone={phone} call_sid={call_sid} err={exc}")

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
    return topics
