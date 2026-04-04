from __future__ import annotations

import asyncio
import base64
import time
import uuid
from typing import Dict

import httpx
from fastapi import APIRouter, HTTPException, Response

from src.config.env import env
from src.utils.logger import logger

router = APIRouter()

_VALID_SARVAM_MODELS = {"bulbul:v2", "bulbul:v3-beta", "bulbul:v3"}
_FALLBACK_SPEAKER = "priya"
_DEFAULT_SPEAKER = (env.SARVAM_TTS_DEFAULT_SPEAKER or _FALLBACK_SPEAKER).strip() or _FALLBACK_SPEAKER
SARVAM_VOICES = {
    "en-IN": _DEFAULT_SPEAKER,
    "hi-IN": _DEFAULT_SPEAKER,
    "mr-IN": _DEFAULT_SPEAKER,
}

# ── Validate TTS model at startup ───────────────────────────────────────
if env.SARVAM_TTS_MODEL not in _VALID_SARVAM_MODELS:
    _corrected_model = "bulbul:v3"
    logger.warning(
        f"Invalid Sarvam TTS model configured: '{env.SARVAM_TTS_MODEL}'. "
        f"Valid options: {_VALID_SARVAM_MODELS}. Auto-correcting to '{_corrected_model}'."
    )
    # Patch the env value so all downstream usage is correct
    env.SARVAM_TTS_MODEL = _corrected_model

_TTS_CACHE: Dict[str, bytes] = {}


def _sanitize_tts_text(text: str, max_chars: int) -> str:
    cleaned = " ".join((text or "").split()).strip()
    if not cleaned:
        return "Thank you for calling Fateh Education."

    if len(cleaned) <= max_chars:
        return cleaned

    truncated = cleaned[:max_chars].strip()
    sentence_cut = max(truncated.rfind("."), truncated.rfind("?"), truncated.rfind("!"))
    if sentence_cut >= max_chars // 2:
        return truncated[: sentence_cut + 1].strip()

    word_cut = truncated.rfind(" ")
    if word_cut >= max_chars // 2:
        return truncated[:word_cut].strip()

    return truncated


def _safe_error_body(response: httpx.Response, limit: int = 400) -> str:
    body = (response.text or "").strip()
    if not body:
        return "<empty>"
    one_line = " ".join(body.split())
    if len(one_line) <= limit:
        return one_line
    return f"{one_line[:limit]}..."


def _is_invalid_speaker_response(response: httpx.Response) -> bool:
    if response.status_code != 400:
        return False
    body = _safe_error_body(response, limit=1200).lower()
    return "speaker" in body and "not recognized" in body


async def _post_tts_request(client: httpx.AsyncClient, text: str, language_code: str, speaker: str) -> httpx.Response:
    return await client.post(
        env.SARVAM_TTS_URL,
        headers={
            "api-subscription-key": env.SARVAM_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "inputs": [text],
            "target_language_code": language_code,
            "speaker": speaker,
            "model": env.SARVAM_TTS_MODEL,
        },
    )


async def synthesize_speech(text: str, language_code: str) -> bytes:
    voice = SARVAM_VOICES.get(language_code, _DEFAULT_SPEAKER)
    safe_text = _sanitize_tts_text(text, max(100, int(env.SARVAM_TTS_MAX_CHARS)))

    t0 = time.monotonic()
    async with httpx.AsyncClient(timeout=min(env.SARVAM_TTS_TIMEOUT_SEC, 5.0)) as client:
        try:
            response = await _post_tts_request(client, safe_text, language_code, voice)
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            if _is_invalid_speaker_response(exc.response) and voice != _FALLBACK_SPEAKER:
                logger.warning(
                    "Sarvam TTS speaker rejected; retrying with fallback speaker | "
                    f"configured_speaker={voice} fallback_speaker={_FALLBACK_SPEAKER} lang={language_code}"
                )
                retry_response = await _post_tts_request(client, safe_text, language_code, _FALLBACK_SPEAKER)
                retry_response.raise_for_status()
                response = retry_response
            else:
                logger.error(
                    "Sarvam TTS request failed | "
                    f"status={exc.response.status_code} model={env.SARVAM_TTS_MODEL} "
                    f"speaker={voice} lang={language_code} body={_safe_error_body(exc.response)}"
                )
                raise
        except Exception as exc:
            logger.error(
                f"Sarvam TTS request failed | model={env.SARVAM_TTS_MODEL} speaker={voice} err={exc}"
            )
            raise

        payload = response.json()

    elapsed = time.monotonic() - t0
    encoded_audio = (payload.get("audios") or [""])[0]
    if not encoded_audio:
        raise ValueError("Sarvam TTS returned empty audio")
    audio_bytes = base64.b64decode(encoded_audio)
    logger.info(f"Sarvam TTS OK | elapsed={elapsed:.2f}s size={len(audio_bytes)}B")
    return audio_bytes


async def cache_tts_audio(call_sid: str, audio_bytes: bytes) -> str:
    token = f"{call_sid}_{uuid.uuid4().hex[:8]}"
    _TTS_CACHE[token] = audio_bytes
    asyncio.create_task(_expire_tts(token, env.TTS_CACHE_TTL_SEC))
    return token


async def _expire_tts(token: str, delay: int) -> None:
    await asyncio.sleep(delay)
    _TTS_CACHE.pop(token, None)


@router.get("/tts/{token}")
async def serve_tts(token: str) -> Response:
    audio = _TTS_CACHE.get(token)
    if not audio:
        raise HTTPException(status_code=404, detail="Audio not found")
    return Response(content=audio, media_type="audio/wav")
