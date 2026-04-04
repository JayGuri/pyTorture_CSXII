from __future__ import annotations

from typing import Any, Dict, List, Optional

from src.db.supabase_client import supabase
from src.utils.logger import logger


class KBChunk:
    def __init__(
        self,
        id: str,
        chunk_text: str,
        source_type: str,
        metadata: Dict[str, Any],
        rank: float,
    ):
        self.id = id
        self.chunk_text = chunk_text
        self.source_type = source_type
        self.metadata = metadata
        self.rank = rank


async def retrieve_kb(query_text: str, max_results: int = 5) -> List[KBChunk]:
    try:
        result = supabase.rpc(
            "search_kb_chunks",
            {"query_text": query_text, "match_count": max_results},
        ).execute()

        if not result.data:
            return []

        return [
            KBChunk(
                id=row.get("id", ""),
                chunk_text=row.get("chunk_text", ""),
                source_type=row.get("source_type", ""),
                metadata=row.get("metadata", {}),
                rank=row.get("rank", 0.0),
            )
            for row in result.data
        ]
    except Exception as exc:
        logger.error(f"KB retrieval error: {exc}")
        return []
