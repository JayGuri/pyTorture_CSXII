import logging
from typing import List, Dict, Any
from src.services.kb_service import KBService
from src.services.llm.groq_chat import generate_reply
from src.config.env import env

logger = logging.getLogger(__name__)

class AskFatehService:
    """
    Service for the 'Ask Fateh' chatbot.
    Uses the comprehensive KB and Groq for inference.
    """

    @classmethod
    async def ask(cls, user_query: str, history: List[Dict[str, str]] = None) -> str:
        try:
            # 1. Load and Sub-set Knowledge Base
            full_kb = KBService.load_comprehensive_kb()
            
            # Prune aggressively to fit well under 100KB (aiming for ~30KB)
            kb_context = {
                "identity": full_kb.get("consultant_identity"),
                "uk": full_kb.get("uk", {}).get("_overview"),
                "scripts": full_kb.get("voice_agent_scripts"),
                "financials": full_kb.get("financial_calculator"),
                "faqs": {k: v for i, (k, v) in enumerate(full_kb.get("common_faqs", {}).items()) if i < 15}
            }
            
            import json
            kb_json = json.dumps(kb_context, separators=(',', ':'))
            
            # 2. Prepare System Prompt
            system_prompt = f"""
You are the "Fateh AI Advisor". Ground yourself in these facts:
{kb_json}

Guidelines:
- Facts: Use the provided financials/scripts for fees and tone.
- Privacy: Never share individual's private data.
- Brevity: Keep replies under 60 words.
""".strip()

            # 3. Call LLM
            messages = history or []
            messages.append({"role": "user", "content": user_query})
            
            # We use the existing groq_chat module which handles retries and word limits
            # Note: groq_chat.generate_reply already limits reply words to 90 by default.
            reply = await generate_reply(system_prompt, messages)
            
            if not reply:
                return "I'm having trouble connecting to my knowledge base right now. Please try again or book a counselling call."
                
            return reply

        except Exception as e:
            logger.error(f"Error in AskFatehService.ask: {e}")
            return "I encountered an error while processing your request. Please try again later."
