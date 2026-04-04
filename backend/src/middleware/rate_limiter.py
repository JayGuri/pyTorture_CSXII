from __future__ import annotations

import time
from collections import defaultdict

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

WINDOW_MS = 60_000  # 1 minute
MAX_REQUESTS = 120

_request_counts: dict[str, dict] = {}


class RateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        ip = request.client.host if request.client else "unknown"
        now = time.time() * 1000  # ms

        entry = _request_counts.get(ip)
        if entry is None or now > entry["reset_at"]:
            entry = {"count": 0, "reset_at": now + WINDOW_MS}
            _request_counts[ip] = entry

        entry["count"] += 1

        if entry["count"] > MAX_REQUESTS:
            return JSONResponse(
                status_code=429,
                content={"error": "Too many requests. Please slow down."},
            )

        response = await call_next(request)
        return response
