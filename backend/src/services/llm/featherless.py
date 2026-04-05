from __future__ import annotations

import asyncio
import time
from typing import Dict, List, Optional

import httpx

from src.config.env import env
from src.utils.logger import logger

# Cooldown state shared per-process and reset if model changes.
_failure_cooldown_until_monotonic: float = 0.0
_failure_cooldown_model: str = ""


class FeatherlessProviderError(RuntimeError):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        status_code: Optional[int] = None,
        retryable: bool = True,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.retryable = retryable


def _limit_reply_words(text: str, max_words: int = 90) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text.strip()
    return " ".join(words[:max_words]).strip()


def _has_active_failure_cooldown() -> bool:
    global _failure_cooldown_until_monotonic, _failure_cooldown_model

    if _failure_cooldown_model and _failure_cooldown_model != env.FEATHERLESS_MODEL:
        _failure_cooldown_until_monotonic = 0.0
        _failure_cooldown_model = ""
        return False

    return time.monotonic() < _failure_cooldown_until_monotonic


def _failure_cooldown_remaining_sec() -> int:
    remaining = _failure_cooldown_until_monotonic - time.monotonic()
    return max(0, int(remaining))


def _activate_failure_cooldown(reason: str) -> None:
    global _failure_cooldown_until_monotonic, _failure_cooldown_model

    cooldown_sec = max(1, int(env.FEATHERLESS_FAILURE_COOLDOWN_SEC))
    cooldown_until = time.monotonic() + cooldown_sec
    _failure_cooldown_until_monotonic = max(_failure_cooldown_until_monotonic, cooldown_until)
    _failure_cooldown_model = env.FEATHERLESS_MODEL

    logger.warning(
        "Featherless cooldown activated | "
        f"model={env.FEATHERLESS_MODEL} reason={reason} cooldown_sec={cooldown_sec}"
    )


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


def _is_qwen3_model(model_name: str) -> bool:
    return "qwen3" in (model_name or "").strip().lower()


def _classify_http_error(status_code: int, body_text: str) -> FeatherlessProviderError:
    lowered = (body_text or "").lower()

    if status_code == 401:
        return FeatherlessProviderError(
            "unauthenticated",
            "Featherless API key was rejected",
            status_code=status_code,
            retryable=False,
        )

    if status_code == 403:
        return FeatherlessProviderError(
            "gated_or_unauthorized",
            "Featherless model is gated or access is not authorized",
            status_code=status_code,
            retryable=False,
        )

    if status_code == 429:
        return FeatherlessProviderError(
            "rate_limited",
            "Featherless rate limit reached",
            status_code=status_code,
            retryable=True,
        )

    if status_code == 503:
        return FeatherlessProviderError(
            "insufficient_capacity",
            "Featherless has no available executor for this model",
            status_code=status_code,
            retryable=True,
        )

    if status_code >= 500:
        return FeatherlessProviderError(
            "server_error",
            "Featherless returned an internal server error",
            status_code=status_code,
            retryable=True,
        )

    if status_code == 400 and (
        "cold" in lowered
        or "not ready for inference" in lowered
        or "loading" in lowered
        or "warm" in lowered
    ):
        return FeatherlessProviderError(
            "model_not_ready",
            "Featherless model is currently cold or loading",
            status_code=status_code,
            retryable=True,
        )

    return FeatherlessProviderError(
        "request_error",
        f"Featherless request failed with status={status_code}",
        status_code=status_code,
        retryable=False,
    )


async def generate_reply(system_prompt: str, messages: List[Dict[str, str]]) -> str:
    if not messages:
        return ""

    if not env.FEATHERLESS_API_KEY:
        logger.warning("Featherless key missing | skip_provider_call=true")
        return ""

    if _has_active_failure_cooldown():
        logger.warning(
            "Featherless cooldown active | "
            f"model={env.FEATHERLESS_MODEL} skip_provider_call=true "
            f"remaining_sec={_failure_cooldown_remaining_sec()}"
        )
        return ""

    max_attempts = max(1, int(env.FEATHERLESS_MAX_RETRIES))
    backoff_base = max(0.0, float(env.FEATHERLESS_RETRY_BACKOFF_BASE_SEC))
    request_timeout_sec = max(15, float(env.FEATHERLESS_TIMEOUT_SEC))

    payload = {
        "model": env.FEATHERLESS_MODEL,
        "messages": _build_messages(system_prompt, messages),
        "temperature": 0.35,
        "max_tokens": max(64, int(env.FEATHERLESS_MAX_OUTPUT_TOKENS)),
    }

    if _is_qwen3_model(env.FEATHERLESS_MODEL):
        # Qwen3 supports disabling chain-of-thought via chat template kwargs.
        payload["chat_template_kwargs"] = {"enable_thinking": False}

    endpoint = f"{env.FEATHERLESS_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {env.FEATHERLESS_API_KEY}",
        "Content-Type": "application/json",
    }

    for attempt in range(max_attempts):
        try:
            t0 = time.monotonic()
            async with httpx.AsyncClient(timeout=request_timeout_sec) as client:
                response = await client.post(endpoint, headers=headers, json=payload)
            elapsed = time.monotonic() - t0

            if response.status_code != 200:
                error = _classify_http_error(response.status_code, response.text)
                logger.warning(
                    "Featherless request failed | "
                    f"model={env.FEATHERLESS_MODEL} status={response.status_code} "
                    f"code={error.code} attempt={attempt + 1}/{max_attempts}"
                )

                if attempt == max_attempts - 1 or not error.retryable:
                    _activate_failure_cooldown(error.code)
                    raise error

                sleep_sec = backoff_base * (2 ** attempt)
                if sleep_sec > 0:
                    await asyncio.sleep(sleep_sec)
                continue

            data = response.json()
            choices = data.get("choices") or []
            text = ""
            if choices:
                message = choices[0].get("message") or {}
                text = message.get("content") or choices[0].get("text") or ""

            logger.info(f"Featherless reply OK | model={env.FEATHERLESS_MODEL} elapsed={elapsed:.2f}s")
            return _limit_reply_words(str(text).strip())

        except httpx.TimeoutException as exc:
            logger.warning(
                "Featherless timeout | "
                f"model={env.FEATHERLESS_MODEL} attempt={attempt + 1}/{max_attempts}"
            )
            if attempt == max_attempts - 1:
                raise FeatherlessProviderError(
                    "timeout",
                    "Featherless request timed out",
                    retryable=True,
                ) from exc

        except httpx.RequestError as exc:
            logger.warning(
                "Featherless network error | "
                f"model={env.FEATHERLESS_MODEL} attempt={attempt + 1}/{max_attempts} err={exc}"
            )
            if attempt == max_attempts - 1:
                raise FeatherlessProviderError(
                    "network_error",
                    "Featherless request failed due to network transport error",
                    retryable=True,
                ) from exc

    _activate_failure_cooldown("exhausted_retries")
    return ""
