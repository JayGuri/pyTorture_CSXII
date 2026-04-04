from __future__ import annotations

from src.db.supabase_client import supabase
from src.utils.logger import logger


async def log_kb_gap(session_id: str, question: str, context: str) -> None:
    try:
        supabase.table("kb_gaps").insert({
            "session_id": session_id,
            "question": question,
            "context": context[:500],
            "status": "pending",
        }).execute()
        logger.info(f"KB gap logged | session={session_id} question={question[:80]}")
    except Exception as exc:
        logger.error(f"Failed to log KB gap: {exc}")
