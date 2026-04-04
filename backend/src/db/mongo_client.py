from __future__ import annotations

from urllib.parse import urlparse

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from src.config.env import env
from src.utils.logger import logger

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def _resolve_database_name(uri: str) -> str:
    path = urlparse(uri).path.strip("/")
    return path or "fateh"


async def connect_db() -> None:
    global _client, _db

    if _client is not None and _db is not None:
        return
    if not env.MONGODB_URI:
        raise RuntimeError("MONGODB_URI is not configured")

    _client = AsyncIOMotorClient(env.MONGODB_URI, serverSelectionTimeoutMS=5000)
    _db = _client[_resolve_database_name(env.MONGODB_URI)]

    await _db.command("ping")
    await _db.callers.create_index("phone", unique=True)
    await _db.callers.create_index("classification")
    await _db.callers.create_index("lead_score")
    await _db.callers.create_index("last_contact")

    logger.info("MongoDB connected and indexes ensured")


async def disconnect_db() -> None:
    global _client, _db
    if _client is not None:
        _client.close()
    _client = None
    _db = None


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("MongoDB not connected. Call connect_db() first.")
    return _db


async def ping_db() -> bool:
    db = get_db()
    result = await db.command("ping")
    return result.get("ok") == 1
