from __future__ import annotations

import asyncio
import time
from typing import Dict, List

import httpx

from src.config.env import env
from src.utils.logger import logger


def _limit_reply_words(text: str, max_words: int = 90) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text.strip()
    return " ".join(words[:max_words]).strip()


def _normalize_role(role: str) -> str:
    lowered = (role or "").strip().lower()
    if lowered in {"assistant", "model"}:
        return "assistant"
    if lowered == "system":
        return "system"
    return "user"


def _build_messages(system_prompt: str, messages: List[Dict[str, str]]) -> List[Dict[str, str]]:
    payload_messages: List[Dict[str, str]] = []

    if system_prompt.strip():
        payload_messages.append({"role": "system", "content": system_prompt.strip()})

    for message in messages:
        content = (message.get("content") or "").strip()
        if not content:
            continue
        payload_messages.append(
            {
                "role": _normalize_role(message.get("role", "user")),
                "content": content,
            }
        )

    return payload_messages


def _is_retryable_status(status_code: int) -> bool:
    return status_code == 429 or status_code >= 500


def _candidate_keys() -> List[str]:
    keys: List[str] = []
    for key in (env.GROQ_API_KEY, env.GROQ_API_KEY_FALLBACK):
        cleaned = (key or "").strip()
        if not cleaned:
            continue
        if cleaned not in keys:
            keys.append(cleaned)
    return keys


async def generate_reply(system_prompt: str, messages: List[Dict[str, str]]) -> str:
    if not messages:
        return ""

    keys = _candidate_keys()
    if not keys:
        logger.warning("Groq LLM key missing | skip_provider_call=true")
        return ""

    max_attempts = max(1, int(env.GROQ_LLM_MAX_RETRIES))
    backoff_base = max(0.0, float(env.GROQ_LLM_RETRY_BACKOFF_BASE_SEC))
    request_timeout_sec = max(0.5, float(env.GROQ_LLM_TIMEOUT_SEC))

    payload = {
        "model": env.GROQ_LLM_MODEL,
        "messages": _build_messages(system_prompt, messages),
        "temperature": 0.25,
        "max_tokens": max(32, int(env.GROQ_LLM_MAX_OUTPUT_TOKENS)),
    }
    endpoint = f"{env.GROQ_LLM_BASE_URL.rstrip('/')}/chat/completions"
    for key_index, key in enumerate(keys):
        key_label = "primary" if key_index == 0 else "fallback"
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

        for attempt in range(max_attempts):
            try:
                t0 = time.monotonic()
                async with httpx.AsyncClient(timeout=request_timeout_sec) as client:
                    response = await client.post(endpoint, headers=headers, json=payload)
                elapsed = time.monotonic() - t0

                if response.status_code != 200:
                    logger.warning(
                        "Groq LLM request failed | "
                        f"model={env.GROQ_LLM_MODEL} key={key_label} status={response.status_code} "
                        f"attempt={attempt + 1}/{max_attempts}"
                    )

                    if attempt < max_attempts - 1 and _is_retryable_status(response.status_code):
                        sleep_sec = backoff_base * (2 ** attempt)
                        if sleep_sec > 0:
                            await asyncio.sleep(sleep_sec)
                        continue

                    break

                data = response.json()
                choices = data.get("choices") or []
                text = ""
                if choices:
                    message = choices[0].get("message") or {}
                    text = message.get("content") or choices[0].get("text") or ""

                logger.info(
                    f"Groq LLM reply OK | model={env.GROQ_LLM_MODEL} key={key_label} elapsed={elapsed:.2f}s"
                )
                return _limit_reply_words(str(text).strip())

            except httpx.TimeoutException:
                logger.warning(
                    "Groq LLM timeout | "
                    f"model={env.GROQ_LLM_MODEL} key={key_label} attempt={attempt + 1}/{max_attempts}"
                )
                if attempt == max_attempts - 1:
                    break

            except httpx.RequestError as exc:
                logger.warning(
                    "Groq LLM network error | "
                    f"model={env.GROQ_LLM_MODEL} key={key_label} attempt={attempt + 1}/{max_attempts} err={exc}"
                )
                if attempt == max_attempts - 1:
                    break

        if key_index < len(keys) - 1:
            logger.warning(
                "Groq LLM switching API key | "
                f"model={env.GROQ_LLM_MODEL} from_key={key_label} to_key=fallback"
            )

    return ""
