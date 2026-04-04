from __future__ import annotations

from datetime import datetime, timezone

from src.services.cache.redis_client import cache_set
from src.utils.logger import logger

TTL_7D = 7 * 24 * 3600
TTL_30D = 30 * 24 * 3600


async def seed_visa_data() -> None:
    try:
        ts = datetime.now(timezone.utc).isoformat()

        # UK visa data (official 2024-25 rates)
        await cache_set("visa:uk_fee_gbp", {"fee": 490, "updated_at": ts, "source": "UK Home Office"}, TTL_7D)
        await cache_set("visa:ihs_per_year", {"amount": 776, "updated_at": ts, "source": "UK Home Office"}, TTL_7D)
        await cache_set("visa:london_monthly", {"amount": 1334, "updated_at": ts, "source": "UK Home Office"}, TTL_7D)
        await cache_set("visa:outside_monthly", {"amount": 1023, "updated_at": ts, "source": "UK Home Office"}, TTL_7D)

        # Ireland
        await cache_set("visa:ie_fee_eur", {"fee": 60, "updated_at": ts, "source": "INIS Ireland"}, TTL_7D)

        # Wages
        await cache_set("wages:uk_min_hourly", {"rate": 12.21, "updated_at": ts}, TTL_30D)
        await cache_set("wages:ie_min_hourly", {"rate": 13.50, "updated_at": ts}, TTL_30D)

        # Intakes
        await cache_set("intake:uk_sep", {"status": "Open", "updated_at": ts}, TTL_30D)
        await cache_set("intake:uk_jan", {"status": "Open", "updated_at": ts}, TTL_30D)
        await cache_set("intake:ie_sep", {"status": "Open", "updated_at": ts}, TTL_30D)

        # IELTS
        await cache_set("ielts:fee_inr", {"fee": 17500, "updated_at": ts}, TTL_30D)

        # Flights (approximate INR values)
        await cache_set("flight:bom_lhr", {"low": 35000, "avg": 55000, "high": 90000, "updated_at": ts}, TTL_7D)
        await cache_set("flight:del_lhr", {"low": 32000, "avg": 50000, "high": 85000, "updated_at": ts}, TTL_7D)
        await cache_set("flight:pnq_lhr", {"low": 38000, "avg": 60000, "high": 95000, "updated_at": ts}, TTL_7D)
        await cache_set("flight:bom_dub", {"low": 37000, "avg": 60000, "high": 95000, "updated_at": ts}, TTL_7D)

        logger.info("Visa fees, wages, intakes, and flight data seeded to Redis")
    except Exception as exc:
        logger.error(f"Visa fee seeding failed: {exc}")
