from __future__ import annotations

from src.utils.logger import logger


async def research_kb_gaps() -> None:
    logger.info("KB gap researcher: skipped (Featherless.ai does not support tool use)")
    # Future: implement with an LLM that supports web_search tool
