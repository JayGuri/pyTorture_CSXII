from __future__ import annotations

import time

import httpx

from src.config.env import env
from src.utils.logger import logger

GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions"


def _map_language(language_code: str) -> str:
    return {
        "en-IN": "en",
        "hi-IN": "hi",
        "mr-IN": "mr",
    }.get(language_code, "en")


async def download_twilio_recording(recording_url: str) -> bytes:
    url = recording_url if recording_url.endswith(".wav") else f"{recording_url}.wav"
    timeout = httpx.Timeout(min(env.WEBHOOK_RECORDING_DOWNLOAD_TIMEOUT_SEC, 5.0))

    t0 = time.monotonic()
    async with httpx.AsyncClient(timeout=timeout, auth=(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)) as client:
        response = await client.get(url)
        response.raise_for_status()
        elapsed = time.monotonic() - t0
        logger.info(f"Twilio recording downloaded | elapsed={elapsed:.2f}s size={len(response.content)}B")
        return response.content


async def transcribe_audio(audio_bytes: bytes, language_code: str) -> str:
    timeout = httpx.Timeout(min(env.GROQ_STT_TIMEOUT_SEC, 5.0))

    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                GROQ_STT_URL,
                headers={"Authorization": f"Bearer {env.GROQ_STT_API_KEY}"},
                files={"file": ("audio.wav", audio_bytes, "audio/wav")},
                data={
                    "model": "whisper-large-v3-turbo",
                    "language": _map_language(language_code),
                    "response_format": "json",
                },
            )
    except Exception as exc:
        elapsed = time.monotonic() - t0
        logger.error(f"Groq STT request failed | elapsed={elapsed:.2f}s err={exc}")
        return ""

    elapsed = time.monotonic() - t0

    if response.status_code == 429 or response.status_code >= 500:
        logger.warning(f"Groq STT temporary failure | status={response.status_code} elapsed={elapsed:.2f}s")
        return ""

    try:
        response.raise_for_status()
        text = (response.json().get("text") or "").strip()
        logger.info(f"Groq STT OK | elapsed={elapsed:.2f}s chars={len(text)}")
        return text
    except Exception as exc:
        logger.error(f"Groq STT response parsing failed | elapsed={elapsed:.2f}s err={exc}")
        return ""

