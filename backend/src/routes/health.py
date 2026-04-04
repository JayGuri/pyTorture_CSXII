from __future__ import annotations

from datetime import datetime, timezone

import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from src.config.env import env
from src.db.mongo_client import ping_db
from src.services.tts.sarvam import synthesize_speech

router = APIRouter(prefix="/api/health")


async def _check_mongodb() -> str:
    try:
        return "ok" if await ping_db() else "error"
    except Exception:
        return "error"


async def _check_groq() -> str:
    if not env.GROQ_API_KEY:
        return "error"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {env.GROQ_API_KEY}"},
            )
            return "ok" if response.status_code == 200 else "error"
    except Exception:
        return "error"


async def _check_gemini() -> str:
    if not env.GEMINI_API_KEY:
        return "error"
    model_name = env.GEMINI_MODEL if env.GEMINI_MODEL.startswith("models/") else f"models/{env.GEMINI_MODEL}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"https://generativelanguage.googleapis.com/v1beta/{model_name}",
                params={"key": env.GEMINI_API_KEY},
            )
            return "ok" if response.status_code == 200 else "error"
    except Exception:
        return "error"


async def _check_sarvam() -> str:
    if not env.SARVAM_API_KEY:
        return "error"
    try:
        audio = await synthesize_speech("Health check", "en-IN")
        return "ok" if audio else "error"
    except Exception:
        return "error"


def _check_public_url() -> str:
    return "ok" if not env.public_url_issues() else "error"


@router.get("")
async def health_check():
    checks = {
        "mongodb": await _check_mongodb(),
        "groq": await _check_groq(),
        "gemini": await _check_gemini(),
        "sarvam": await _check_sarvam(),
        "public_url": _check_public_url(),
    }
    healthy = all(value == "ok" for value in checks.values())
    status_code = 200 if healthy else 503

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if healthy else "degraded",
            "checks": checks,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
