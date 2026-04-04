from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter
from typing import Any, Dict, List

import httpx

from src.config.env import env
from src.utils.logger import logger

@dataclass(frozen=True)
class STTContract:
    name: str
    endpoint: str
    auth_header: str
    model: str
    language_field: str


def _build_auth_headers(header_name: str) -> Dict[str, str]:
    key = env.SARVAM_API_KEY.strip()
    normalized = header_name.strip().lower()
    if normalized in {"bearer", "authorization", "authorization:bearer"}:
        return {"Authorization": f"Bearer {key}"}
    return {header_name: key}


def _auth_mode_label(header_name: str) -> str:
    normalized = header_name.strip().lower()
    if normalized in {"bearer", "authorization", "authorization:bearer"}:
        return "Authorization:Bearer"
    return header_name


def _build_contracts() -> List[STTContract]:
    candidates = [
        STTContract(
            name="primary",
            endpoint=env.SARVAM_STT_PRIMARY_URL.strip(),
            auth_header=env.SARVAM_STT_AUTH_HEADER.strip(),
            model=env.SARVAM_STT_MODEL.strip(),
            language_field=env.SARVAM_STT_LANGUAGE_FIELD.strip(),
        ),
        STTContract(
            name="fallback",
            endpoint=env.SARVAM_STT_FALLBACK_URL.strip(),
            auth_header=env.SARVAM_STT_FALLBACK_AUTH_HEADER.strip(),
            model=env.SARVAM_STT_FALLBACK_MODEL.strip(),
            language_field=env.SARVAM_STT_FALLBACK_LANGUAGE_FIELD.strip(),
        ),
    ]

    contracts: List[STTContract] = []
    seen: set[tuple[str, str, str, str]] = set()
    for contract in candidates:
        if not all([contract.endpoint, contract.auth_header, contract.model, contract.language_field]):
            continue

        endpoint = contract.endpoint.rstrip("/")
        dedupe_key = (
            endpoint,
            contract.auth_header.lower(),
            contract.model,
            contract.language_field,
        )
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)

        contracts.append(
            STTContract(
                name=contract.name,
                endpoint=endpoint,
                auth_header=contract.auth_header,
                model=contract.model,
                language_field=contract.language_field,
            )
        )

    return contracts


def _find_first_text(payload: Any) -> str:
    preferred = ["transcript", "text", "output", "content", "message", "answer"]

    if isinstance(payload, dict):
        # Check preferred keys first
        for key in preferred:
            val = payload.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()

        # OpenAI-style choices
        choices = payload.get("choices")
        if isinstance(choices, list) and choices:
            choice = choices[0]
            if isinstance(choice, dict):
                message = choice.get("message", {})
                if isinstance(message, dict):
                    content = message.get("content")
                    if isinstance(content, str) and content.strip():
                        return content.strip()

        # Recurse into values
        for val in payload.values():
            nested = _find_first_text(val)
            if nested:
                return nested

    if isinstance(payload, list):
        for item in payload:
            nested = _find_first_text(item)
            if nested:
                return nested

    if isinstance(payload, str) and payload.strip():
        return payload.strip()

    return ""


def _safe_response_snippet(response: httpx.Response, limit: int = 280) -> str:
    text = response.text.strip()
    if not text:
        return "<empty>"
    one_line = " ".join(text.split())
    return one_line if len(one_line) <= limit else f"{one_line[:limit]}..."


async def transcribe_audio(audio_bytes: bytes, language_code: str) -> str:
    if not env.SARVAM_API_KEY:
        logger.error("Sarvam STT skipped because SARVAM_API_KEY is missing")
        return ""

    contracts = _build_contracts()
    if not contracts:
        logger.error("Sarvam STT skipped because no valid contract is configured")
        return ""

    last_reason = ""
    last_detail = ""

    async with httpx.AsyncClient(timeout=env.HTTP_TIMEOUT_SEC) as client:
        for contract in contracts:
            files = {
                "file": ("call_audio.wav", audio_bytes, "audio/wav"),
            }
            data = {
                "model": contract.model,
                contract.language_field: language_code,
            }

            started = perf_counter()
            try:
                response = await client.post(
                    contract.endpoint,
                    files=files,
                    data=data,
                    headers=_build_auth_headers(contract.auth_header),
                )
                latency_ms = int((perf_counter() - started) * 1000)

                if response.status_code >= 400:
                    snippet = _safe_response_snippet(response)
                    last_reason = f"http_{response.status_code}"
                    last_detail = snippet
                    logger.warning(
                        "Sarvam STT attempt failed | "
                        f"contract={contract.name} endpoint={contract.endpoint} "
                        f"auth={_auth_mode_label(contract.auth_header)} model={contract.model} "
                        f"lang_field={contract.language_field} status={response.status_code} "
                        f"latency_ms={latency_ms} body={snippet}"
                    )
                    continue

                payload = response.json()
                transcript = _find_first_text(payload)
                if transcript:
                    logger.info(
                        "Sarvam STT success | "
                        f"contract={contract.name} endpoint={contract.endpoint} "
                        f"model={contract.model} latency_ms={latency_ms} transcript={transcript[:100]}"
                    )
                    return transcript

                last_reason = "empty_transcript"
                last_detail = f"status={response.status_code}"
                logger.warning(
                    "Sarvam STT empty transcript | "
                    f"contract={contract.name} endpoint={contract.endpoint} "
                    f"model={contract.model} latency_ms={latency_ms} payload_type={type(payload).__name__}"
                )
            except httpx.RequestError as exc:
                last_reason = "request_error"
                last_detail = str(exc)
                logger.warning(
                    "Sarvam STT request failed | "
                    f"contract={contract.name} endpoint={contract.endpoint} "
                    f"auth={_auth_mode_label(contract.auth_header)} model={contract.model} err={exc}"
                )
            except ValueError as exc:
                last_reason = "invalid_json"
                last_detail = str(exc)
                logger.warning(
                    "Sarvam STT response parse failed | "
                    f"contract={contract.name} endpoint={contract.endpoint} model={contract.model} err={exc}"
                )
            except Exception as exc:
                last_reason = "unexpected_error"
                last_detail = str(exc)
                logger.error(
                    "Sarvam STT unexpected error | "
                    f"contract={contract.name} endpoint={contract.endpoint} model={contract.model} err={exc}"
                )

    if last_reason:
        logger.error(f"Sarvam STT failed for all contracts | reason={last_reason} detail={last_detail}")
    return ""


async def download_twilio_recording(recording_url: str) -> bytes:
    final_url = recording_url if recording_url.endswith(".wav") else f"{recording_url}.wav"

    async with httpx.AsyncClient(timeout=env.HTTP_TIMEOUT_SEC) as client:
        response = await client.get(
            final_url,
            auth=(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN),
        )
        response.raise_for_status()
        return response.content
