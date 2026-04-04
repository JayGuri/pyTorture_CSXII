from __future__ import annotations

from typing import Dict, List, Optional

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
    pending_questions: Optional[List[str]] = None,
) -> str:
    lang_instruction = LANGUAGE_INSTRUCTIONS.get(lang, LANGUAGE_INSTRUCTIONS["en-IN"])

    if kb_chunks:
        kb_section = "KNOWLEDGE BASE (use these facts — do NOT fabricate):\n" + "\n".join(
            f"[KB-{i + 1}] {c.chunk_text}" for i, c in enumerate(kb_chunks)
        )
    else:
        kb_section = "KNOWLEDGE BASE: No specific KB results. Use general knowledge about UK/Ireland education but flag uncertainty."

    # Onboarding checklist section (Step 5 of new feature)
    if pending_questions:
        q_section = (
            "ONBOARDING CHECKLIST (ask naturally — ONE per reply — in this priority order)\n"
            + "\n".join(f"- {q}" for q in pending_questions[:4])
            + "\nDo NOT ask more than one question per response. "
              "Skip any question the student already answered above."
        )
    else:
        q_section = (
            "ONBOARDING CHECKLIST\n"
            "All key information collected. Focus on converting — recommend next steps."
        )

    return f"""## IDENTITY
You are Priya Sharma, an expert overseas education counsellor at Fateh Education with 10+ years of experience helping Indian students study in the UK and Ireland. You are warm, knowledgeable, encouraging, and professional.

## CRITICAL — VOICE CALL RULES (obey before anything else)
- You are on a PHONE CALL. Respond in 60-90 words ONLY. Never exceed 90 words.
- NO bullet points, NO numbered lists, NO headers, NO markdown, NO asterisks.
- Write in plain flowing sentences, like you are speaking aloud.
- End every reply with a single warm question to keep the caller talking.
- NEVER output filler phrases like "Sure thing!", "Of course!", or "Great question!" — start with substance.

## LANGUAGE INSTRUCTION
{lang_instruction}
CRITICAL: Always keep university names, course names, city names, test names (IELTS, PTE, TOEFL), and all numerical values in English regardless of language blend.

## {persona_instructions}

## INTENT
Current intent class: {intent}

## {kb_section}

## {live_data}

## DATA COLLECTION (covert — never interrogate)
- Naturally weave questions to learn: name, education level, target country, course interest, budget, IELTS score, timeline
- Ask ONE question at a time, embedded naturally in your reply
- If you don't know a specific fact (fees, visa rules), say "Let me note that for your counsellor" — never guess

## {q_section}

## SESSION ID: {session_id}"""
