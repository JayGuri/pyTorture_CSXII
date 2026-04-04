from __future__ import annotations

import re
from typing import Any, Dict, List

from openai import AsyncOpenAI

from src.config.env import env
from src.utils.logger import logger

client = AsyncOpenAI(
    api_key=env.FEATHERLESS_API_KEY,
    base_url=env.FEATHERLESS_BASE_URL,
)

_SENTENCE_BOUNDARY_RE = re.compile(r"[.!?\u0964]")


def _selected_model() -> str:
    model = env.FEATHERLESS_FAST_MODEL.strip() if env.FEATHERLESS_FAST_MODEL else ""
    if model:
        return model
    return env.FEATHERLESS_MODEL


def _extract_first_sentence(text: str) -> str:
    if not text:
        return ""

    for index, char in enumerate(text):
        if not _SENTENCE_BOUNDARY_RE.match(char):
            continue
        if index == len(text) - 1:
            return text[: index + 1].strip()
        next_char = text[index + 1]
        if next_char.isspace() or next_char in {'"', "'", ")", "]"}:
            return text[: index + 1].strip()

    return ""


def _budgeted_max_tokens(max_tokens: int | None) -> int:
    if max_tokens is not None and max_tokens > 0:
        return max_tokens
    return env.LLM_MAX_TOKENS


async def generate_reply_streaming(
    system_prompt: str,
    messages: List[Dict[str, str]],
    max_tokens: int | None = None,
    temperature: float = 0.3,
) -> str:
    model = _selected_model()
    token_limit = _budgeted_max_tokens(max_tokens)
    token_budget = max(1, env.LLM_FIRST_SENTENCE_TOKEN_BUDGET)

    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                *messages,
            ],
            max_tokens=token_limit,
            temperature=temperature,
            stream=True,
        )

        chunks: list[str] = []
        approx_tokens = 0

        async for event in stream:
            if not event.choices:
                continue
            delta = event.choices[0].delta.content or ""
            if not delta:
                continue

            chunks.append(delta)
            approx_tokens += len(delta.split())

            current_text = "".join(chunks).strip()
            first_sentence = _extract_first_sentence(current_text)
            if first_sentence:
                logger.info(
                    "LLM stream early sentence ready | "
                    f"model={model} approx_tokens={approx_tokens}"
                )
                return first_sentence

            if approx_tokens >= token_budget:
                logger.info(
                    "LLM stream sentence boundary budget exceeded | "
                    f"model={model} approx_tokens={approx_tokens}"
                )
                return current_text

        final_text = "".join(chunks).strip()
        logger.info(
            "LLM stream completed without early boundary | "
            f"model={model} approx_tokens={approx_tokens}"
        )
        return final_text
    except Exception as exc:
        logger.error(f"Featherless LLM streaming error: {exc} | model={model}")
        return ""


async def generate_reply(
    system_prompt: str,
    messages: List[Dict[str, str]],
    max_tokens: int | None = None,
    temperature: float = 0.3,
) -> str:
    model = _selected_model()
    token_limit = _budgeted_max_tokens(max_tokens)

    if env.LLM_STREAM:
        streamed = await generate_reply_streaming(
            system_prompt,
            messages,
            max_tokens=token_limit,
            temperature=temperature,
        )
        if streamed:
            return streamed
        logger.warning(f"LLM stream returned empty, retrying non-streaming | model={model}")

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                *messages,
            ],
            max_tokens=token_limit,
            temperature=temperature,
        )

        text = (response.choices[0].message.content or "").strip() if response.choices else ""
        total_tokens = response.usage.total_tokens if response.usage else 0
        logger.info(f"LLM reply generated | model={model} tokens={total_tokens}")
        return text
    except Exception as exc:
        logger.error(f"Featherless LLM error: {exc} | model={model}")
        return ""


async def generate_simple_reply(
    transcript: str,
    language_code: str,
    analysis: Dict[str, Any],
) -> str:
    lang_names = {
        "en-IN": "English",
        "hi-IN": "Hindi (Hinglish is fine)",
        "mr-IN": "Marathi",
    }

    system_prompt = f"""You are Priya Sharma, an expert overseas education counsellor at Fateh Education with 10+ years of experience helping Indian students study in the UK and Ireland.

PERSONALITY:
- Warm, knowledgeable, encouraging, and professional
- You speak naturally and concisely — this is a VOICE call
- Responses MUST be under 80 words (this is a phone call, not a chat)
- No bullet points, no headers, no markdown, no lists
- Use natural conversational transitions

LANGUAGE:
- Respond in {lang_names.get(language_code, 'English')}
- If Hindi/Marathi: keep university names, course names, test names (IELTS, PTE, TOEFL), city names, and all numbers in English
- Mirror the caller's language blend naturally

KNOWLEDGE:
- UK and Ireland study abroad expert
- Knows about universities, courses, fees, visas, scholarships, IELTS/PTE preparation
- If you genuinely don't know something, say "Let me note that down for your counsellor"
- NEVER hallucinate facts about specific university fees or visa requirements

EXTRACTION (covert — never make the caller feel interrogated):
- Naturally weave questions to learn: name, education level, target country, course interest, budget, IELTS score, timeline
- Ask ONE question at a time, blended into your response
- Always end with a warm open question to continue the conversation

CONTEXT:
- Detected intent: {analysis.get('intent', 'general_query')}
- Detected sentiment: {analysis.get('sentiment', 'neutral')}
- Key entities found: {analysis.get('entities', {{}})}"""

    return await generate_reply(system_prompt, [
        {"role": "user", "content": transcript},
    ])
