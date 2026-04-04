from __future__ import annotations

from datetime import datetime, timezone

import httpx

from src.services.cache.redis_client import cache_set
from src.utils.logger import logger

TTL_6H = 6 * 3600


async def refresh_rates() -> None:
    ts = datetime.now(timezone.utc).isoformat()

    # Try primary API: exchangerate-api.com (free tier, no auth required)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get("https://api.exchangerate-api.com/v4/latest/GBP")
            res.raise_for_status()
            data = res.json()

        if data.get("rates"):
            rates = data["rates"]
            inr = rates.get("INR", 107.5)
            eur = rates.get("EUR", 1.17)

            await cache_set("fx:gbp_inr", {"rate": inr, "updated_at": ts, "source": "exchangerate-api.com"}, TTL_6H)
            await cache_set("fx:eur_inr", {"rate": (inr / eur) if eur else 91.8, "updated_at": ts, "source": "exchangerate-api.com"}, TTL_6H)
            await cache_set("fx:gbp_eur", {"rate": eur, "updated_at": ts, "source": "exchangerate-api.com"}, TTL_6H)
            logger.info(f"Exchange rates refreshed | gbp_inr={inr} source=exchangerate-api.com")
            return
    except Exception as exc:
        logger.warning(f"Primary API failed, trying fallback API | err={exc}")

    # Fallback API: fixer.io (check if key available)
    try:
        from src.config.env import env
        if hasattr(env, 'FIXER_API_KEY') and env.FIXER_API_KEY:
            async with httpx.AsyncClient(timeout=15) as client:
                res = await client.get(f"http://api.fixer.io/latest?access_key={env.FIXER_API_KEY}&base=GBP&symbols=INR,EUR")
                res.raise_for_status()
                data = res.json()

            if data.get("success") and data.get("rates"):
                rates = data["rates"]
                inr = rates.get("INR", 107.5)
                eur = rates.get("EUR", 1.17)

                await cache_set("fx:gbp_inr", {"rate": inr, "updated_at": ts, "source": "fixer.io"}, TTL_6H)
                await cache_set("fx:eur_inr", {"rate": (inr / eur) if eur else 91.8, "updated_at": ts, "source": "fixer.io"}, TTL_6H)
                await cache_set("fx:gbp_eur", {"rate": eur, "updated_at": ts, "source": "fixer.io"}, TTL_6H)
                logger.info(f"Exchange rates refreshed | gbp_inr={inr} source=fixer.io")
                return
    except Exception as exc:
        logger.warning(f"Fixer.io API failed | err={exc}")

    # Use hardcoded fallback
    logger.warning("All exchange rate APIs failed, using hardcoded fallback values")
    await cache_set("fx:gbp_inr", {"rate": 107.5, "updated_at": ts, "source": "fallback"}, TTL_6H)
    await cache_set("fx:eur_inr", {"rate": 91.8, "updated_at": ts, "source": "fallback"}, TTL_6H)
    await cache_set("fx:gbp_eur", {"rate": 1.17, "updated_at": ts, "source": "fallback"}, TTL_6H)
