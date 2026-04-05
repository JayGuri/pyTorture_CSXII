from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def normalize_phone(raw: str) -> str:
    digits = re.sub(r"[^\d+]", "", raw or "")
    if not digits:
        return ""
    if digits.startswith("+"):
        return digits
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    return digits


def serialize_mongo(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: serialize_mongo(item) for key, item in value.items()}
    if isinstance(value, list):
        return [serialize_mongo(item) for item in value]
    return value
