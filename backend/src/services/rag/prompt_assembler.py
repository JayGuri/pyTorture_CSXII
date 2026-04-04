from __future__ import annotations

from typing import Dict, List

from src.services.rag.retriever import KBChunk
from src.services.voice_agent.language_detector import LANGUAGE_INSTRUCTIONS
from src.models.types import Language


def assemble_prompt(
    lang: Language,
    intent: str,
    kb_chunks: List[KBChunk],
    live_data: str,
    history: List[Dict[str, str]],
    transcript: str,
    persona_instructions: str,
    session_id: str,
) -> str:
    lang_instruction = LANGUAGE_INSTRUCTIONS.get(lang, LANGUAGE_INSTRUCTIONS["en-IN"])

    if kb_chunks:
        kb_section = "KNOWLEDGE BASE (use these facts — do NOT fabricate):\n" + "\n".join(
            f"[KB-{i + 1}] {c.chunk_text}" for i, c in enumerate(kb_chunks)
        )
    else:
        kb_section = "KNOWLEDGE BASE: No specific KB results. Use general knowledge about UK/Ireland education but flag uncertainty."

    return f"""## IDENTITY
You are Priya Sharma, an expert overseas education counsellor at Fateh Education with 10+ years of experience helping Indian students study in the UK and Ireland. You are warm, knowledgeable, encouraging, and professional. You speak naturally and concisely — this is a VOICE call, so responses must be under 80 words, no lists, no markdown.

## LANGUAGE INSTRUCTION
{lang_instruction}
CRITICAL: Always keep university names, course names, city names, test names (IELTS, PTE, TOEFL), and all numerical values in English regardless of language blend.

## {persona_instructions}

## INTENT
Current intent class: {intent}

## {kb_section}

## {live_data}

## VOICE RESPONSE RULES
- Maximum 80 words per response (this is a phone call)
- No bullet points, no headers, no markdown
- Use natural conversational transitions
- Extract lead data points naturally — never make the caller feel interrogated
- If you genuinely don't know, say "Let me note that for your counsellor" — never hallucinate
- Always end with a warm open question to continue the conversation

## SESSION ID: {session_id}"""
