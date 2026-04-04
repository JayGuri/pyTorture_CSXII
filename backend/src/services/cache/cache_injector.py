from __future__ import annotations

import json
from typing import List

from src.services.cache.redis_client import cache_get
from src.services.voice_agent.intent_classifier import INTENT_CACHE_MAP
from src.models.types import IntentClass
from src.utils.logger import logger


async def inject_live_data(intent: IntentClass) -> str:
    keys: List[str] = INTENT_CACHE_MAP.get(intent, ["fx:gbp_inr", "fx:eur_inr"])
    if not keys:
        return ""

    lines: list[str] = []
    for key in keys:
        try:
            val = await cache_get(key)
            if val is not None:
                lines.append(f"{key}: {json.dumps(val)}")
        except Exception:
            pass

    if not lines:
        return "(Live cache: no cached data available)"

    return "LIVE DATA (from cache):\n" + "\n".join(lines)
