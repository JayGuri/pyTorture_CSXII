from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from src.config.env import env
from src.db.supabase_client import supabase
from src.services.cache.redis_client import redis_ping

router = APIRouter(prefix="/api/health")


@router.get("")
async def health_check():
    checks: dict[str, str] = {}
    warnings: list[str] = []

    # Supabase ping
    try:
        _ = supabase.table("call_sessions").select("id").limit(1).execute()
        checks["supabase"] = "ok"
    except Exception:
        checks["supabase"] = "error"

    # Redis ping
    try:
        ok = await redis_ping()
        checks["redis"] = "ok" if ok else "error"
    except Exception:
        checks["redis"] = "error"

    checks["sarvam_api_key"] = "ok" if env.SARVAM_API_KEY.strip() else "error"

    public_url_issues = env.public_url_issues()
    if not public_url_issues:
        checks["public_url"] = "ok"
    elif env.should_fail_fast_public_url():
        checks["public_url"] = "error"
        warnings.extend(public_url_issues)
    else:
        checks["public_url"] = "warning"
        warnings.extend(public_url_issues)

    has_error = any(v == "error" for v in checks.values())
    status_code = 200 if not has_error else 503

    payload = {
        "status": "healthy" if not has_error else "degraded",
        "checks": checks,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    if warnings:
        payload["warnings"] = warnings

    return JSONResponse(content=payload, status_code=status_code)
