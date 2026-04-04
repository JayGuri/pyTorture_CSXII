from __future__ import annotations

import asyncio
import time
from typing import Dict, List, Optional, Tuple

from src.config.env import env
from src.services.llm import featherless as featherless_provider
from src.services.llm import gemini as gemini_provider
from src.services.llm import groq_chat as groq_provider
from src.services.llm.featherless import FeatherlessProviderError
from src.utils.logger import logger


def _remaining_budget_sec(started_at: float, total_budget_sec: Optional[float]) -> Optional[float]:
    if total_budget_sec is None:
        return None
    return max(0.0, float(total_budget_sec) - (time.monotonic() - started_at))


def _effective_featherless_timeout_sec(total_budget_sec: Optional[float]) -> Optional[float]:
    configured_timeout = max(15, float(env.FEATHERLESS_TIMEOUT_SEC))

    if total_budget_sec is None:
        return configured_timeout

    reserve_for_fallback = max(0.0, float(env.GEMINI_FALLBACK_MIN_BUDGET_SEC))
    available_for_primary = float(total_budget_sec) - reserve_for_fallback
    if available_for_primary <= 0.1:
        return None

    return min(configured_timeout, max(0.05, available_for_primary))


async def _call_gemini(
    system_prompt: str,
    messages: List[Dict[str, str]],
    timeout_sec: Optional[float],
) -> str:
    if timeout_sec is None:
        return await gemini_provider.generate_reply(system_prompt, messages)

    return await asyncio.wait_for(
        gemini_provider.generate_reply(system_prompt, messages),
        timeout=max(0.05, float(timeout_sec)),
    )


async def _call_groq(
    system_prompt: str,
    messages: List[Dict[str, str]],
    timeout_sec: Optional[float],
) -> str:
    if timeout_sec is None:
        return await groq_provider.generate_reply(system_prompt, messages)

    return await asyncio.wait_for(
        groq_provider.generate_reply(system_prompt, messages),
        timeout=max(0.05, float(timeout_sec)),
    )


async def generate_reply_with_fallback(
    system_prompt: str,
    messages: List[Dict[str, str]],
    *,
    llm_time_budget_sec: Optional[float] = None,
    request_label: str = "main",
) -> Tuple[str, str]:
    if not messages:
        return "", "none"

    started_at = time.monotonic()
    fallback_reason = "not_attempted"

    provider_setting = (env.LLM_PRIMARY_PROVIDER or "featherless").strip().lower()

    if provider_setting == "groq":
        groq_timeout = _remaining_budget_sec(started_at, llm_time_budget_sec)
        if groq_timeout is not None and groq_timeout <= 0.1:
            logger.warning(
                "Skipping Groq due to exhausted LLM budget | "
                f"label={request_label} budget_sec={llm_time_budget_sec}"
            )
            return "", "none"

        try:
            reply = await _call_groq(system_prompt, messages, groq_timeout)
            if reply:
                return reply, "groq"

            logger.warning(f"Groq returned empty reply | label={request_label}")
            return "", "none"
        except asyncio.TimeoutError:
            logger.warning(
                "Groq timed out | "
                f"label={request_label} timeout_sec={groq_timeout}"
            )
            return "", "none"
        except Exception as exc:
            logger.error(
                "Groq failed | "
                f"label={request_label} err={exc}"
            )
            return "", "none"

    use_featherless_primary = provider_setting != "gemini"

    if use_featherless_primary and env.FEATHERLESS_API_KEY:
        primary_timeout = _effective_featherless_timeout_sec(llm_time_budget_sec)

        if primary_timeout is None:
            fallback_reason = "insufficient_budget_for_featherless"
            logger.warning(
                "Skipping Featherless due to low budget | "
                f"label={request_label} budget_sec={llm_time_budget_sec} "
                f"reserve_sec={env.GEMINI_FALLBACK_MIN_BUDGET_SEC}"
            )
        else:
            try:
                reply = await asyncio.wait_for(
                    featherless_provider.generate_reply(system_prompt, messages),
                    timeout=primary_timeout,
                )
                if reply:
                    return reply, "featherless"
                fallback_reason = "empty_featherless_reply"
            except asyncio.TimeoutError:
                fallback_reason = "featherless_timeout"
                logger.warning(
                    "Featherless timed out, switching to Gemini | "
                    f"label={request_label} timeout_sec={primary_timeout:.2f}"
                )
            except FeatherlessProviderError as exc:
                fallback_reason = f"featherless_{exc.code}"
                logger.warning(
                    "Featherless failed, switching to Gemini | "
                    f"label={request_label} code={exc.code} status={exc.status_code}"
                )
            except Exception as exc:
                fallback_reason = "featherless_exception"
                logger.error(
                    "Featherless unexpected error, switching to Gemini | "
                    f"label={request_label} err={exc}"
                )
    elif use_featherless_primary:
        fallback_reason = "missing_featherless_key"
    else:
        fallback_reason = "primary_provider_set_to_gemini"

    gemini_timeout = _remaining_budget_sec(started_at, llm_time_budget_sec)
    if gemini_timeout is not None and gemini_timeout <= 0.1:
        logger.warning(
            "Skipping Gemini fallback due to exhausted LLM budget | "
            f"label={request_label} fallback_reason={fallback_reason}"
        )
        return "", "none"

    try:
        reply = await _call_gemini(system_prompt, messages, gemini_timeout)
        if reply:
            logger.info(
                "LLM fallback complete | "
                f"label={request_label} provider=gemini reason={fallback_reason}"
            )
            return reply, "gemini"

        logger.warning(
            "Gemini fallback returned empty | "
            f"label={request_label} reason={fallback_reason}"
        )
        return "", "none"
    except asyncio.TimeoutError:
        logger.warning(
            "Gemini fallback timed out | "
            f"label={request_label} reason={fallback_reason} timeout_sec={gemini_timeout}"
        )
        return "", "none"
    except Exception as exc:
        logger.error(
            "Gemini fallback failed | "
            f"label={request_label} reason={fallback_reason} err={exc}"
        )
        return "", "none"
