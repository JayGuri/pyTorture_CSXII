from __future__ import annotations

from typing import Dict, List, Optional

from src.config.env import env
from src.db.mongo_client import get_db
from src.services.llm.gemini import summarize_conversation
from src.utils.helpers import utc_now_iso
from src.utils.logger import logger

SUMMARY_THRESHOLD = env.CONTEXT_SUMMARY_THRESHOLD
MAX_MESSAGES = env.MAX_CONTEXT_MESSAGES


def _default_memory() -> Dict:
    return {
        "messages": [],
        "summary": None,
        "last_summary_at": None,
        "total_turns": 0,
        "topics_discussed": [],
    }


async def load_memory(phone: str) -> Dict:
    try:
        db = get_db()
        document = await db.callers.find_one({"_id": phone}, {"memory": 1})
        if document and "memory" in document:
            return {**_default_memory(), **document["memory"]}
    except Exception as exc:
        logger.error(f"Failed to load memory | phone={phone} err={exc}")
    return _default_memory()


async def save_turn(phone: str, user_msg: str, ai_msg: str, topics: List[str]) -> None:
    try:
        db = get_db()
        now = utc_now_iso()
        memory = await load_memory(phone)

        messages = list(memory.get("messages", []))
        messages.extend(
            [
                {"role": "user", "content": user_msg, "timestamp": now},
                {"role": "assistant", "content": ai_msg, "timestamp": now},
            ]
        )

        topic_set = set(memory.get("topics_discussed", []))
        topic_set.update(topics)

        summary = memory.get("summary")
        last_summary_at = memory.get("last_summary_at")

        if len(messages) >= SUMMARY_THRESHOLD:
            to_summarize = max(2, len(messages) - (MAX_MESSAGES // 2))
            older_messages = messages[:to_summarize]
            kept_messages = messages[to_summarize:]

            try:
                summary = await _summarize_old_messages(summary, older_messages)
                last_summary_at = now
                messages = kept_messages
                logger.info(f"Conversation memory summarized | phone={phone} kept_messages={len(messages)}")
            except Exception as exc:
                logger.error(f"Memory summarization failed | phone={phone} err={exc}")
                messages = messages[-MAX_MESSAGES:]

        await db.callers.update_one(
            {"_id": phone},
            {
                "$set": {
                    "memory.messages": messages[-MAX_MESSAGES:],
                    "memory.summary": summary,
                    "memory.last_summary_at": last_summary_at,
                    "memory.topics_discussed": sorted(topic_set),
                    "memory.total_turns": int(memory.get("total_turns", 0)) + 1,
                    "updated_at": now,
                    "last_contact": now,
                }
            },
            upsert=False,
        )
    except Exception as exc:
        logger.error(f"Failed to save memory turn | phone={phone} err={exc}")


async def _summarize_old_messages(existing_summary: Optional[str], messages_to_summarize: List[Dict]) -> str:
    return await summarize_conversation(existing_summary, messages_to_summarize)


def build_context_for_llm(memory: Dict, current_call_history: List[Dict]) -> List[Dict]:
    messages: List[Dict[str, str]] = []

    summary = memory.get("summary")
    if summary:
        messages.append({"role": "user", "content": f"[Previous conversation summary]\n{summary}"})
        messages.append({"role": "assistant", "content": "Understood. I will continue with that context in mind."})

    for message in memory.get("messages", [])[-MAX_MESSAGES:]:
        messages.append({"role": message["role"], "content": message["content"]})

    messages.extend(current_call_history)
    return messages
