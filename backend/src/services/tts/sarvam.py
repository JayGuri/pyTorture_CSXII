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
_FALLBACK_SPEAKER = "anushka"
_DEFAULT_SPEAKER = (env.SARVAM_TTS_DEFAULT_SPEAKER or _FALLBACK_SPEAKER).strip() or _FALLBACK_SPEAKER
SARVAM_VOICES = {
    "en-IN": _DEFAULT_SPEAKER,
    "hi-IN": _DEFAULT_SPEAKER,
    "mr-IN": _DEFAULT_SPEAKER,
}

# ── Validate TTS model at startup ───────────────────────────────────────
if env.SARVAM_TTS_MODEL not in _VALID_SARVAM_MODELS:
    _corrected_model = "bulbul:v2"
    logger.warning(
        f"Invalid Sarvam TTS model configured: '{env.SARVAM_TTS_MODEL}'. "
        f"Valid options: {_VALID_SARVAM_MODELS}. Auto-correcting to '{_corrected_model}'."
    )
    env.SARVAM_TTS_MODEL = _corrected_model

# ── API keys: primary + fallback ────────────────────────────────────────
_API_KEYS = [k for k in [env.SARVAM_API_KEY, env.SARVAM_API_KEY_FALLBACK] if k]
if not _API_KEYS:
    logger.error("No Sarvam TTS API keys configured — TTS will always fall back to Polly")

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
    return "speaker" in body and ("not recognized" in body or "not compatible" in body)


async def _post_tts_request(client: httpx.AsyncClient, text: str, language_code: str, speaker: str, api_key: str) -> httpx.Response:
    return await client.post(
        env.SARVAM_TTS_URL,
        headers={
            "api-subscription-key": api_key,
            "Content-Type": "application/json",
        },
        json={
            "inputs": [text],
            "target_language_code": language_code,
            "speaker": speaker,
            "model": env.SARVAM_TTS_MODEL,
        },
    )


async def synthesize_speech(
    text: str,
    language_code: str,
    *,
    max_key_attempts: int | None = None,
    enable_speaker_fallback: bool = True,
    request_timeout_sec: float | None = None,
) -> bytes:
    voice = SARVAM_VOICES.get(language_code, _DEFAULT_SPEAKER)
    safe_text = _sanitize_tts_text(text, max(100, int(env.SARVAM_TTS_MAX_CHARS)))

    candidate_keys = list(_API_KEYS)
    if max_key_attempts is not None:
        candidate_keys = candidate_keys[: max(1, int(max_key_attempts))]

    if not candidate_keys:
        raise RuntimeError("No Sarvam API keys configured")

    per_request_timeout = min(env.SARVAM_TTS_TIMEOUT_SEC, 8.0)
    if request_timeout_sec is not None:
        per_request_timeout = max(0.5, min(per_request_timeout, float(request_timeout_sec)))

    t0 = time.monotonic()
    last_exc: Exception | None = None

    for key_index, api_key in enumerate(candidate_keys):
        key_label = "primary" if key_index == 0 else "fallback"
        try:
            _connect_timeout = min(3.0, per_request_timeout * 0.35)
            _read_timeout = per_request_timeout
            _timeout = httpx.Timeout(connect=_connect_timeout, read=_read_timeout, write=5.0, pool=5.0)
            async with httpx.AsyncClient(timeout=_timeout) as client:
                response = await _post_tts_request(client, safe_text, language_code, voice, api_key)
                response.raise_for_status()

                payload = response.json()
                elapsed = time.monotonic() - t0
                encoded_audio = (payload.get("audios") or [""])[0]
                if not encoded_audio:
                    raise ValueError("Sarvam TTS returned empty audio")
                audio_bytes = base64.b64decode(encoded_audio)
                logger.info(f"Sarvam TTS OK | key={key_label} elapsed={elapsed:.2f}s size={len(audio_bytes)}B")
                return audio_bytes

        except httpx.HTTPStatusError as exc:
            if enable_speaker_fallback and _is_invalid_speaker_response(exc.response) and voice != _FALLBACK_SPEAKER:
                logger.warning(
                    f"Sarvam TTS speaker rejected; retrying with fallback speaker | "
                    f"key={key_label} configured_speaker={voice} fallback_speaker={_FALLBACK_SPEAKER}"
                )
                try:
                    _fb_timeout = httpx.Timeout(connect=_connect_timeout, read=_read_timeout, write=5.0, pool=5.0)
                    async with httpx.AsyncClient(timeout=_fb_timeout) as client2:
                        retry_response = await _post_tts_request(client2, safe_text, language_code, _FALLBACK_SPEAKER, api_key)
                        retry_response.raise_for_status()
                        payload = retry_response.json()
                        elapsed = time.monotonic() - t0
                        encoded_audio = (payload.get("audios") or [""])[0]
                        if not encoded_audio:
                            raise ValueError("Sarvam TTS returned empty audio after speaker fallback")
                        audio_bytes = base64.b64decode(encoded_audio)
                        logger.info(f"Sarvam TTS OK (speaker fallback) | key={key_label} elapsed={elapsed:.2f}s size={len(audio_bytes)}B")
                        return audio_bytes
                except Exception as inner_exc:
                    last_exc = inner_exc
                    logger.warning(f"Sarvam TTS speaker fallback also failed | key={key_label} err={repr(inner_exc)}")
            else:
                last_exc = exc
                logger.warning(
                    f"Sarvam TTS failed with key={key_label} | "
                    f"status={exc.response.status_code} body={_safe_error_body(exc.response)}"
                )
        except httpx.ReadTimeout as exc:
            # Single fast retry on read timeout before moving to next key
            logger.warning(f"Sarvam TTS ReadTimeout with key={key_label}, retrying once | err={repr(exc)}")
            try:
                _retry_timeout = httpx.Timeout(connect=2.0, read=per_request_timeout + 2.0, write=5.0, pool=5.0)
                async with httpx.AsyncClient(timeout=_retry_timeout) as retry_client:
                    response = await _post_tts_request(retry_client, safe_text, language_code, voice, api_key)
                    response.raise_for_status()
                    payload = response.json()
                    elapsed = time.monotonic() - t0
                    encoded_audio = (payload.get("audios") or [""])[0]
                    if not encoded_audio:
                        raise ValueError("Sarvam TTS returned empty audio on retry")
                    audio_bytes = base64.b64decode(encoded_audio)
                    logger.info(f"Sarvam TTS OK (retry after ReadTimeout) | key={key_label} elapsed={elapsed:.2f}s size={len(audio_bytes)}B")
                    return audio_bytes
            except Exception as retry_exc:
                last_exc = retry_exc
                logger.warning(f"Sarvam TTS retry also failed with key={key_label} | err={repr(retry_exc)}")
        except Exception as exc:
            last_exc = exc
            logger.warning(f"Sarvam TTS failed with key={key_label} | err={repr(exc)}")

    # All keys exhausted
    elapsed = time.monotonic() - t0
    logger.error(f"Sarvam TTS all keys exhausted | elapsed={elapsed:.2f}s last_err={repr(last_exc)}")
    raise last_exc or RuntimeError("Sarvam TTS failed with all API keys")


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
