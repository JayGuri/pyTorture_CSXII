from __future__ import annotations

from typing import Any, Dict, List

from openai import AsyncOpenAI

from src.config.env import env
from src.utils.logger import logger

client = AsyncOpenAI(
    api_key=env.FEATHERLESS_API_KEY,
    base_url=env.FEATHERLESS_BASE_URL,
)


async def generate_reply(
    system_prompt: str,
    messages: List[Dict[str, str]],
    max_tokens: int = 250,
    temperature: float = 0.3,
) -> str:
    try:
        response = await client.chat.completions.create(
            model=env.FEATHERLESS_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                *messages,
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )

        text = (response.choices[0].message.content or "").strip() if response.choices else ""
        total_tokens = response.usage.total_tokens if response.usage else 0
        logger.info(f"LLM reply generated | model={env.FEATHERLESS_MODEL} tokens={total_tokens}")
        return text
    except Exception as exc:
        logger.error(f"Featherless LLM error: {exc} | model={env.FEATHERLESS_MODEL}")
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
