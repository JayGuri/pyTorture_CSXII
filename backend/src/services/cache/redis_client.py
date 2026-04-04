from __future__ import annotations

import json
from typing import Any, Optional, TypeVar

from upstash_redis import Redis

from src.config.env import env
from src.utils.logger import logger

redis = Redis(url=env.UPSTASH_REDIS_REST_URL, token=env.UPSTASH_REDIS_REST_TOKEN)

T = TypeVar("T")


async def cache_set(key: str, value: Any, ttl_seconds: int) -> None:
    try:
        redis.set(key, json.dumps(value), ex=ttl_seconds)
    except Exception as exc:
        logger.error(f"Redis SET failed for key={key}: {exc}")


async def cache_set_if_absent(key: str, value: Any, ttl_seconds: int) -> bool:
    try:
        result = redis.set(key, json.dumps(value), ex=ttl_seconds, nx=True)
        return bool(result)
    except Exception as exc:
        logger.error(f"Redis SET NX failed for key={key}: {exc}")
        return False


async def cache_get(key: str) -> Any | None:
    try:
        raw = redis.get(key)
        if raw is None:
            return None
        if isinstance(raw, str):
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return raw
        return raw
    except Exception as exc:
        logger.error(f"Redis GET failed for key={key}: {exc}")
        return None


async def cache_delete(key: str) -> None:
    try:
        redis.delete(key)
    except Exception as exc:
        logger.error(f"Redis DEL failed for key={key}: {exc}")


async def redis_ping() -> bool:
    try:
        res = redis.ping()
        return res == "PONG"
    except Exception:
        return False
