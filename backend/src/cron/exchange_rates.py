from __future__ import annotations

from datetime import datetime, timezone

import httpx

from src.services.cache.redis_client import cache_set
from src.utils.logger import logger

TTL_6H = 6 * 3600


async def refresh_rates() -> None:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get("https://api.exchangerate.host/latest?base=GBP&symbols=INR,EUR,USD")
            res.raise_for_status()
            data = res.json()

        if not data.get("rates"):
            # Fallback: use hardcoded recent rates
            ts = datetime.now(timezone.utc).isoformat()
            await cache_set("fx:gbp_inr", {"rate": 107.5, "updated_at": ts, "source": "fallback"}, TTL_6H)
            await cache_set("fx:eur_inr", {"rate": 91.8, "updated_at": ts, "source": "fallback"}, TTL_6H)
            await cache_set("fx:gbp_eur", {"rate": 1.17, "updated_at": ts, "source": "fallback"}, TTL_6H)
            logger.info("Exchange rates set from fallback values")
            return

        ts = datetime.now(timezone.utc).isoformat()
        rates = data["rates"]
        inr = rates.get("INR", 107.5)
        eur = rates.get("EUR", 1.17)

        await cache_set("fx:gbp_inr", {"rate": inr, "updated_at": ts, "source": "exchangerate.host"}, TTL_6H)
        await cache_set("fx:eur_inr", {"rate": (inr / eur) if eur else 91.8, "updated_at": ts}, TTL_6H)
        await cache_set("fx:gbp_eur", {"rate": eur, "updated_at": ts}, TTL_6H)
        logger.info(f"Exchange rates refreshed | gbp_inr={inr}")
    except Exception as exc:
        logger.error(f"Exchange rate fetch failed — using fallback: {exc}")
        ts = datetime.now(timezone.utc).isoformat()
        await cache_set("fx:gbp_inr", {"rate": 107.5, "updated_at": ts, "source": "fallback"}, TTL_6H)
        await cache_set("fx:eur_inr", {"rate": 91.8, "updated_at": ts, "source": "fallback"}, TTL_6H)
        await cache_set("fx:gbp_eur", {"rate": 1.17, "updated_at": ts, "source": "fallback"}, TTL_6H)
