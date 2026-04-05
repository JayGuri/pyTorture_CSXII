from __future__ import annotations

import asyncio
import time
from typing import Dict, List, Optional

from google import genai
from google.genai import types

from src.config.env import env
from src.utils.logger import logger

client = genai.Client(api_key=env.GEMINI_API_KEY)

# ── Cooldown state ──────────────────────────────────────────────────────
_quota_cooldown_until_monotonic: float = 0.0
_quota_cooldown_model: str = ""          # track which model triggered it


def _limit_reply_words(text: str, max_words: int = 90) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text.strip()
    return " ".join(words[:max_words]).strip()


def _build_model() -> genai.Client:
    return client


def _is_quota_error(exc: Exception) -> bool:
    error_text = str(exc).lower()
    quota_markers = (
        "quota exceeded",
        "resource exhausted",
        "resourceexhausted",
        "too many requests",
        "429",
        "retry_delay",
        "generate_content_free_tier",
    )
    return any(marker in error_text for marker in quota_markers)


def _has_active_quota_cooldown() -> bool:
    global _quota_cooldown_until_monotonic, _quota_cooldown_model
    # If the configured model changed (e.g. switched from 2.0-flash → 2.5-flash),
    # clear any stale cooldown that belonged to the old model.
    if _quota_cooldown_model and _quota_cooldown_model != env.GEMINI_MODEL:
        _quota_cooldown_until_monotonic = 0.0
        _quota_cooldown_model = ""
        return False
    return time.monotonic() < _quota_cooldown_until_monotonic


def _quota_cooldown_remaining_sec() -> int:
    remaining = _quota_cooldown_until_monotonic - time.monotonic()
    return max(0, int(remaining))


def _activate_quota_cooldown(exc: Exception) -> None:
    global _quota_cooldown_until_monotonic, _quota_cooldown_model

    cooldown_sec = max(1, int(env.GEMINI_QUOTA_COOLDOWN_SEC))
    cooldown_until = time.monotonic() + cooldown_sec
    _quota_cooldown_until_monotonic = max(_quota_cooldown_until_monotonic, cooldown_until)
    _quota_cooldown_model = env.GEMINI_MODEL

    logger.warning(
        "Gemini quota cooldown activated | "
        f"model={env.GEMINI_MODEL} cooldown_sec={cooldown_sec} err={exc}"
    )


async def generate_reply(system_prompt: str, messages: List[Dict[str, str]]) -> str:
    if not messages:
        return ""

    if _has_active_quota_cooldown():
        logger.warning(
            "Gemini quota cooldown active | "
            f"model={env.GEMINI_MODEL} skip_provider_call=true "
            f"remaining_sec={_quota_cooldown_remaining_sec()}"
        )
        return ""

    history = []
    for message in messages[:-1]:
        role = "model" if message["role"] == "assistant" else "user"
        history.append({"role": role, "parts": [{"text": message["content"]}]})

    current_input = messages[-1]["content"]
    max_attempts = max(1, int(env.GEMINI_MAX_RETRIES))
    backoff_base = max(0.0, float(env.GEMINI_RETRY_BACKOFF_BASE_SEC))
    model = env.GEMINI_MODEL

    # Disable thinking for 2.5 models — eliminates 5-8s internal reasoning
    thinking_cfg = None
    if "2.5" in model:
        thinking_cfg = types.ThinkingConfig(thinking_budget=0)

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        max_output_tokens=256,
        temperature=0.35,
        thinking_config=thinking_cfg,
    )

    for attempt in range(max_attempts):
        try:
            t0 = time.monotonic()
            sdk_client = _build_model()
            chat = sdk_client.aio.chats.create(model=model, history=history, config=config)
            response = await chat.send_message(current_input)
            elapsed = time.monotonic() - t0
            text = getattr(response, "text", "") or ""
            logger.info(f"Gemini reply OK | model={model} elapsed={elapsed:.2f}s")
            return _limit_reply_words(text.strip())
        except Exception as exc:
            if _is_quota_error(exc):
                _activate_quota_cooldown(exc)
                return ""

            logger.error(
                f"Gemini reply generation failed | "
                f"model={model} attempt={attempt + 1}/{max_attempts} err={exc}"
            )
            if attempt == max_attempts - 1:
                return ""
            sleep_sec = backoff_base * (2 ** attempt)
            if sleep_sec > 0:
                await asyncio.sleep(sleep_sec)

    return ""


async def summarize_conversation(existing_summary: Optional[str], messages_to_summarize: List[Dict]) -> str:
    if _has_active_quota_cooldown():
        return (existing_summary or "").strip()

    conversation_text = "\n".join(
        f"{message['role'].upper()}: {message['content']}" for message in messages_to_summarize
    )

    prompt_parts = [
        "You are summarizing an older conversation between a student and Priya from Fateh Education.",
        "Write a concise factual summary under 200 words.",
        "Capture interests, education background, finances, tests, decisions, and unanswered questions.",
        "Use third person. Do not invent facts.",
    ]
    if existing_summary:
        prompt_parts.append(f"Existing summary:\n{existing_summary}")
    prompt_parts.append(f"Conversation to summarize:\n{conversation_text}")
    prompt = "\n\n".join(prompt_parts)

    try:
        thinking_cfg = None
        if "2.5" in env.GEMINI_MODEL:
            thinking_cfg = types.ThinkingConfig(thinking_budget=0)

        sdk_client = _build_model()
        response = await sdk_client.aio.models.generate_content(
            model=env.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=300,
                temperature=0.3,
                thinking_config=thinking_cfg,
            ),
        )
        return (getattr(response, "text", "") or "").strip()
    except Exception as exc:
        if _is_quota_error(exc):
            _activate_quota_cooldown(exc)
        else:
            logger.error(f"Gemini summarization failed | model={env.GEMINI_MODEL} err={exc}")
        return (existing_summary or "").strip()
