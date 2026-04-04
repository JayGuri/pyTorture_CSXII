from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from time import perf_counter
from typing import Any, Dict

from src.config.env import env
from src.services.voice_agent.intent_classifier import analyze_transcript, classify_intent
from src.services.voice_agent.language_detector import detect_language_from_text
from src.services.voice_agent.persona_engine import detect_persona, get_persona_instructions
from src.services.voice_agent.data_extractor import extract_lead_data_from_text
from src.services.voice_agent.lead_scorer import calculate_lead_score
from src.services.voice_agent.action_engine import generate_recommended_actions
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
from src.models.types import (
    ExtractedData,
    Language,
    LeadSnapshot,
    PersonaType,
)
from src.utils.logger import logger


class ProcessTurnResult:
    def __init__(self, reply: str, analysis: Dict[str, Any]):
        self.reply = reply
        self.analysis = analysis


async def process_turn(
    state: Dict[str, Any],
    transcript: str,
) -> ProcessTurnResult:
    t0 = perf_counter()

    try:
        lang: Language = state.get("language", "en-IN")
        session_id: str = state["session_id"]
        model = env.FEATHERLESS_FAST_MODEL or env.FEATHERLESS_MODEL
        timings: Dict[str, int] = {}

        # Step 1: Analyze transcript (intent, sentiment, entities)
        analyze_started = perf_counter()
        analysis = analyze_transcript(transcript, lang)
        timings["analyze_ms"] = int((perf_counter() - analyze_started) * 1000)

        # Step 2: Detect language from text (may override IVR selection)
        detect_started = perf_counter()
        detected_lang = detect_language_from_text(transcript)
        timings["language_ms"] = int((perf_counter() - detect_started) * 1000)

        # Step 3: Broadcast student transcript + retrieve KB chunks + live cache in parallel
        prefetch_started = perf_counter()
        kb_chunks, live_data, _ = await asyncio.gather(
            retrieve_kb(transcript, 5),
            inject_live_data(analysis.intent),
            broadcast_transcript(session_id, transcript, True, "student"),
        )
        timings["prefetch_ms"] = int((perf_counter() - prefetch_started) * 1000)

        # Step 4: Detect persona
        persona_started = perf_counter()
        history = state.get("conversation_history", [])
        persona = detect_persona(history, transcript)
        persona_instructions = get_persona_instructions(persona)
        timings["persona_ms"] = int((perf_counter() - persona_started) * 1000)

        # Step 5: Assemble full prompt
        prompt_started = perf_counter()
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
        timings["prompt_ms"] = int((perf_counter() - prompt_started) * 1000)

        # Step 6: Generate LLM response
        messages = [
            {"role": h["role"], "content": h["content"]}
            for h in history
        ] + [{"role": "user", "content": transcript}]

        llm_started = perf_counter()
        reply = await generate_reply(system_prompt, messages[-10:])  # Last 5 exchanges
        timings["llm_ms"] = int((perf_counter() - llm_started) * 1000)

        # Step 7: Update conversation history
        history.append({"role": "user", "content": transcript})
        history.append({"role": "assistant", "content": reply})
        if len(history) > 20:
            history = history[-20:]
        state["conversation_history"] = history

        # Step 8: Broadcast AI response
        ai_broadcast_started = perf_counter()
        await broadcast_transcript(session_id, reply, True, "ai")
        timings["ai_broadcast_ms"] = int((perf_counter() - ai_broadcast_started) * 1000)

        # Step 9: Extract lead data, score, and persist LeadSnapshot (background)
        async def _post_process():
            try:
                if not session_id:
                    logger.warning(
                        f"Skipping lead upsert due to missing session_id | "
                        f"call_sid={state.get('call_sid')}"
                    )
                    return

                # ── Build full snapshot ───────────────────────
                existing_obj: ExtractedData | None = state.get("extracted_data_obj")
                extracted, objections, emotional, completeness_count = \
                    extract_lead_data_from_text(transcript, existing_obj)

                score = calculate_lead_score(extracted)

                # Build a preliminary snapshot for action generation
                preliminary_snapshot = LeadSnapshot(
                    extracted_data=extracted,
                    lead_score=score,
                    persona=persona,
                    unresolved_objections=objections,
                )

                snapshot = LeadSnapshot(
                    session_id=session_id,
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    persona=persona,
                    extracted_data=extracted,
                    lead_score=score,
                    recommended_actions=generate_recommended_actions(preliminary_snapshot),
                    unresolved_objections=objections,
                    data_completeness=completeness_count,
                    data_completeness_pct=round((completeness_count / 12) * 100),
                    emotional_state=emotional,
                )

                state["extracted_data_obj"] = extracted  # keep typed object in state

                # ── Flatten to DB columns (existing schema unchanged) ──
                lead_payload = {
                    "session_id": session_id,
                    # Flat fields from nested model
                    "name":             extracted.name,
                    "phone":            extracted.phone,
                    "email":            extracted.email,
                    "location":         extracted.location.city,
                    "education_level":  extracted.education.level,
                    "field":            extracted.education.field,
                    "institution":      extracted.education.institution,
                    "gpa":              extracted.education.gpa_percentage,
                    "target_countries": extracted.preferences.target_countries,
                    "course_interest":  extracted.preferences.course_interest,
                    "intake_timing":    extracted.preferences.intake_timing,
                    "ielts_score": (
                        extracted.test_status.score
                        if extracted.test_status.exam_type == "IELTS" else None
                    ),
                    "pte_score": (
                        extracted.test_status.score
                        if extracted.test_status.exam_type == "PTE" else None
                    ),
                    "budget_range":          extracted.financial.budget_range,
                    "budget_status":         extracted.financial.budget_status.value,
                    "scholarship_interest":  extracted.financial.scholarship_interest,
                    "application_stage":     extracted.timeline.application_stage,
                    # Scores — map new names back to existing DB columns
                    "lead_score":       score.total,
                    "intent_score":     score.intent_seriousness,
                    "financial_score":  score.financial_readiness,
                    "timeline_score":   score.timeline_urgency,
                    "classification":   score.classification.value,
                    "data_completeness": snapshot.data_completeness_pct,  # DB stores pct
                    "persona_type":     snapshot.persona.value,
                    "emotional_anxiety":    emotional.anxiety.value,
                    "emotional_confidence": emotional.confidence.value,
                    "emotional_urgency":    emotional.urgency.value,
                    "unresolved_objections":  objections,
                    # Full snapshot in counsellor_brief JSONB
                    "counsellor_brief": snapshot.model_dump(),
                    "updated_at":       datetime.now(timezone.utc).isoformat(),
                }

                # Upsert lead in Supabase
                try:
                    supabase.table("leads").upsert(
                        lead_payload,
                        on_conflict="session_id",
                    ).execute()
                except Exception as exc:
                    logger.error(
                        f"Lead upsert failed | session_id={session_id} "
                        f"call_sid={state.get('call_sid')} "
                        f"keys={sorted(lead_payload.keys())} err={exc}"
                    )

                # Broadcast score update (same Socket.IO event shape for frontend)
                await broadcast_score_update(
                    session_id,
                    score.total,
                    score.classification.value,
                    score.intent_seriousness,
                    score.financial_readiness,
                    score.timeline_urgency,
                )

                # Broadcast lead update with count-based completeness for dashboard
                await broadcast_lead_update(session_id, {
                    **snapshot.model_dump(),
                    "data_completeness_count": completeness_count,  # 0-12 for UI
                })

                # Log KB gap if no relevant chunks found
                if len(kb_chunks) == 0 and len(transcript) > 20:
                    await log_kb_gap(session_id, transcript, reply)

                # Update session transcript
                supabase.table("call_sessions").update({
                    "transcript": history,
                    "language_detected": detected_lang or lang,
                    "persona_type": persona.value,
                }).eq("id", session_id).execute()

            except Exception as exc:
                logger.error(f"Post-processing error: {exc}")

        asyncio.create_task(_post_process())

        latency_ms = int((perf_counter() - t0) * 1000)
        timings["total_ms"] = latency_ms
        logger.info(
            "Turn processed | "
            f"call_sid={state.get('call_sid')} intent={analysis.intent} lang={lang} "
            f"model={model} kb_chunks={len(kb_chunks)} "
            f"analyze_ms={timings.get('analyze_ms', 0)} "
            f"language_ms={timings.get('language_ms', 0)} "
            f"prefetch_ms={timings.get('prefetch_ms', 0)} "
            f"persona_ms={timings.get('persona_ms', 0)} "
            f"prompt_ms={timings.get('prompt_ms', 0)} "
            f"llm_ms={timings.get('llm_ms', 0)} "
            f"ai_broadcast_ms={timings.get('ai_broadcast_ms', 0)} "
            f"total_ms={timings.get('total_ms', 0)}"
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
