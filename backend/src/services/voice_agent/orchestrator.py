from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from typing import Any, Dict

from src.services.voice_agent.intent_classifier import analyze_transcript, classify_intent
from src.services.voice_agent.language_detector import detect_language_from_text
from src.services.voice_agent.persona_engine import detect_persona, get_persona_instructions
from src.services.voice_agent.data_extractor import extract_lead_data_from_text
from src.services.voice_agent.lead_scorer import calculate_lead_score
from src.services.rag.retriever import retrieve_kb
from src.services.cache.cache_injector import inject_live_data
from src.services.rag.prompt_assembler import assemble_prompt
from src.services.llm.featherless import generate_reply
from src.services.rag.kb_gaps import log_kb_gap
from src.services.transcription.live_stream import (
    broadcast_transcript,
    broadcast_score_update,
    broadcast_lead_update,
)
from src.db.supabase_client import supabase
from src.models.types import Language
from src.utils.logger import logger


class ProcessTurnResult:
    def __init__(self, reply: str, analysis: Dict[str, Any]):
        self.reply = reply
        self.analysis = analysis


async def process_turn(
    state: Dict[str, Any],
    transcript: str,
) -> ProcessTurnResult:
    t0 = time.time()

    try:
        lang: Language = state.get("language", "en-IN")
        session_id: str = state["session_id"]

        # Broadcast student transcript to dashboard
        await broadcast_transcript(session_id, transcript, True, "student")

        # Step 1: Analyze transcript (intent, sentiment, entities)
        analysis = analyze_transcript(transcript, lang)

        # Step 2: Detect language from text (may override IVR selection)
        detected_lang = detect_language_from_text(transcript)

        # Step 3: Retrieve KB chunks and live data in parallel
        kb_chunks, live_data = await asyncio.gather(
            retrieve_kb(transcript, 5),
            inject_live_data(analysis.intent),
        )

        # Step 4: Detect persona
        history = state.get("conversation_history", [])
        persona = detect_persona(history, transcript)
        persona_instructions = get_persona_instructions(persona)

        # Step 5: Assemble full prompt
        system_prompt = assemble_prompt(
            lang=detected_lang or lang,
            intent=analysis.intent,
            kb_chunks=kb_chunks,
            live_data=live_data,
            history=history,
            transcript=transcript,
            persona_instructions=persona_instructions,
            session_id=session_id,
        )

        # Step 6: Generate LLM response
        messages = [
            {"role": h["role"], "content": h["content"]}
            for h in history
        ] + [{"role": "user", "content": transcript}]

        reply = await generate_reply(system_prompt, messages[-10:])  # Last 5 exchanges

        # Step 7: Update conversation history
        history.append({"role": "user", "content": transcript})
        history.append({"role": "assistant", "content": reply})
        if len(history) > 20:
            history = history[-20:]
        state["conversation_history"] = history

        # Step 8: Broadcast AI response
        await broadcast_transcript(session_id, reply, True, "ai")

        # Step 9: Extract lead data & score (fire-and-forget background task)
        async def _post_process():
            try:
                extracted = extract_lead_data_from_text(transcript, state.get("extracted_data", {}))
                state["extracted_data"] = extracted

                score_result = calculate_lead_score(extracted)

                # Upsert lead in Supabase
                supabase.table("leads").upsert(
                    {
                        "session_id": session_id,
                        **extracted,
                        "lead_score": score_result.score,
                        "classification": score_result.classification,
                        "intent_score": score_result.intent_score,
                        "financial_score": score_result.financial_score,
                        "timeline_score": score_result.timeline_score,
                        "persona_type": persona,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    },
                    on_conflict="session_id",
                ).execute()

                # Broadcast to dashboard
                await broadcast_score_update(
                    session_id,
                    score_result.score,
                    score_result.classification,
                    score_result.intent_score,
                    score_result.financial_score,
                    score_result.timeline_score,
                )
                await broadcast_lead_update(session_id, {**extracted, "persona": persona})

                # Log KB gap if no relevant chunks found
                if len(kb_chunks) == 0 and len(transcript) > 20:
                    await log_kb_gap(session_id, transcript, reply)

                # Update session transcript
                supabase.table("call_sessions").update({
                    "transcript": history,
                    "language_detected": detected_lang or lang,
                    "persona_type": persona,
                }).eq("id", session_id).execute()

            except Exception as exc:
                logger.error(f"Post-processing error: {exc}")

        asyncio.create_task(_post_process())

        latency_ms = int((time.time() - t0) * 1000)
        logger.info(
            f"Turn processed | call_sid={state.get('call_sid')} "
            f"latency={latency_ms}ms intent={analysis.intent} lang={lang}"
        )
        return ProcessTurnResult(reply=reply, analysis=analysis.dict())

    except Exception as exc:
        logger.error(f"Orchestrator error: {exc} | call_sid={state.get('call_sid')}")
        fallback = {
            "en-IN": "I apologize, I had a brief issue. Could you please repeat that?",
            "hi-IN": "Maaf kijiye, ek technical issue hua. Kya aap dobara bata sakte hain?",
            "mr-IN": "माफ करा, एक तांत्रिक समस्या आली. कृपया पुन्हा सांगा.",
        }
        lang = state.get("language", "en-IN")
        return ProcessTurnResult(
            reply=fallback.get(lang, fallback["en-IN"]),
            analysis={},
        )
