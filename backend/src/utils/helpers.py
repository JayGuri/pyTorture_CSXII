from __future__ import annotations

import uuid
from datetime import datetime, timezone
import locale


def generate_id() -> str:
    return str(uuid.uuid4())


def format_inr(amount: float | int) -> str:
    """Format a number as Indian Rupee currency."""
    # Python's locale-based formatting for INR
    try:
        return f"₹{amount:,.0f}"
    except Exception:
        return f"₹{amount}"


def format_gbp(amount: float | int) -> str:
    """Format a number as British Pound currency."""
    try:
        return f"£{amount:,.0f}"
    except Exception:
        return f"£{amount}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def sleep(seconds: float) -> None:
    import asyncio
    await asyncio.sleep(seconds)


def truncate(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    return text[: max_len - 3] + "..."
