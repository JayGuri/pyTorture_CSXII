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

    # Fresh start: drop old collection so we don't have ObjectId _id docs
    try:
        existing_doc = await _db.callers.find_one()
        if existing_doc and not isinstance(existing_doc.get("_id"), str):
            logger.warning("Detected old ObjectId-based _id documents — dropping callers collection for fresh start")
            await _db.callers.drop()
    except Exception as exc:
        logger.warning(f"Collection migration check failed, continuing | err={repr(exc)}")

    # _id is now the phone number, so phone index is redundant
    # but we keep classification/score/contact indexes for dashboard queries
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
