"""
Website Voice Agent Routes
REST API endpoints for web-based voice agent with sentiment analysis and smart data extraction
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
import base64
import logging

from src.config.env import env
from src.services.voice_agent.extractor import extract_updates
from src.services.stt.groq_whisper import transcribe_audio
from src.services.voice_agent.context import get_or_create_context
from src.utils.logger import logger as util_logger

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice-agent", tags=["voice-agent"])


@router.post("/debug")
async def debug_endpoint():
    """Debug endpoint to check raw request"""
    logger.info(f"[DEBUG] Raw request received")
    return {"status": "ok"}


@router.post("/test-validation")
async def test_validation(data: dict):
    """Test endpoint to validate request parsing"""
    logger.info(f"[TEST] Received keys: {list(data.keys())}")
    for key, value in data.items():
        if isinstance(value, str) and len(value) > 100:
            logger.info(f"[TEST] {key}: {type(value).__name__} (length: {len(value)})")
        else:
            logger.info(f"[TEST] {key}: {value} ({type(value).__name__})")
    return {"received": data}


@router.post("/diagnose")
async def diagnose_transcribe(data: dict):
    """Diagnostic endpoint - accepts anything and reports what's received"""
    logger.info("[DIAGNOSE] === TRANSCRIBE DIAGNOSTIC ===")
    logger.info(f"[DIAGNOSE] Received {len(data)} fields")

    required_fields = ["audio_base64", "session_id", "language", "user_id"]
    for field in required_fields:
        if field in data:
            value = data[field]
            if isinstance(value, str) and len(value) > 100:
                logger.info(f"[DIAGNOSE] ✓ {field}: {type(value).__name__} ({len(value)} chars)")
            else:
                logger.info(f"[DIAGNOSE] ✓ {field}: {repr(value)}")
        else:
            logger.warning(f"[DIAGNOSE] ✗ {field}: MISSING")

    extra_fields = [k for k in data.keys() if k not in required_fields]
    if extra_fields:
        logger.info(f"[DIAGNOSE] Extra fields: {extra_fields}")

    # Try to convert to VoiceChunkRequest manually
    try:
        VoiceChunkRequest(**data)
        logger.info("[DIAGNOSE] ✓ Successfully validated as VoiceChunkRequest")
        return {
            "status": "ok",
            "message": "Request is valid",
            "received_fields": list(data.keys()),
        }
    except Exception as e:
        logger.error(f"[DIAGNOSE] ✗ Validation failed: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "received_fields": list(data.keys()),
        }


class VoiceChunkRequest(BaseModel):
    """Request model for processing voice chunk"""
    audio_base64: str  # Base64-encoded WAV/MP3
    session_id: str
    language: str = "en"  # en, hi, mr
    user_id: Optional[str] = None

    class Config:
        # Allow unknown fields to pass through
        extra = "allow"

    def __init__(self, **data):
        logger.debug(f"[VoiceChunkRequest] Initializing with keys: {list(data.keys())}")
        for key, value in data.items():
            if isinstance(value, str) and len(value) > 100:
                logger.debug(f"[VoiceChunkRequest] {key}: {type(value).__name__} (length: {len(value)})")
            else:
                logger.debug(f"[VoiceChunkRequest] {key}: {type(value).__name__}")
        super().__init__(**data)


class SentimentAnalysisRequest(BaseModel):
    """Request model for sentiment analysis"""
    text: str
    language: str = "en"


class DataExtractionRequest(BaseModel):
    """Request model for data extraction"""
    text: str
    language: str = "en"


class VoiceChunkResponse(BaseModel):
    """Response model for voice processing"""
    success: bool
    transcription: Optional[str] = None
    user_sentiment: Optional[str] = None
    sentiment_confidence: Optional[float] = None
    extracted_data: Optional[Dict[str, Any]] = None
    data_coverage: Optional[float] = None
    conversation_turn: Optional[int] = None
    session_summary: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    latency_ms: int = 0


@router.post("/transcribe", response_model=VoiceChunkResponse)
async def transcribe_voice(request: VoiceChunkRequest):
    """
    Transcribe voice audio and analyze sentiment + extract data

    **Features:**
    - Multi-language STT (English, Hindi, Marathi)
    - Real-time sentiment analysis
    - Automatic data point extraction (12+ fields)
    - Conversation context management
    - <3 second latency response
    """
    import time
    start_time = time.time()

    try:
        # Debug: Log incoming request
        logger.info(f"[VOICE_AGENT] Received transcribe request")
        logger.info(f"[VOICE_AGENT] session_id: {request.session_id}")
        logger.info(f"[VOICE_AGENT] language: {request.language}")
        logger.info(f"[VOICE_AGENT] user_id: {request.user_id}")
        logger.info(f"[VOICE_AGENT] audio_base64 length: {len(request.audio_base64) if request.audio_base64 else 0}")

        # Validate inputs
        if not request.audio_base64 or not request.session_id:
            logger.error(f"[VOICE_AGENT] Missing required fields - audio_base64: {bool(request.audio_base64)}, session_id: {bool(request.session_id)}")
            raise HTTPException(status_code=400, detail="Missing audio_base64 or session_id")
        
        # Decode audio
        try:
            audio_bytes = base64.b64decode(request.audio_base64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 audio: {str(e)}")
        
        # Get conversation context
        context = get_or_create_context(
            request.session_id,
            request.language,
            request.user_id
        )
        
        # Step 1: Transcribe audio
        logger.info(f"[{request.session_id}] Transcribing audio ({len(audio_bytes)} bytes)")
        try:
            transcription = await transcribe_audio(
                audio_bytes,
                language_code=request.language,
            )
        except Exception as e:
            logger.error(f"STT error: {e}")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
        
        if not transcription or not transcription.strip():
            return VoiceChunkResponse(
                success=False,
                error="Could not transcribe audio. Please try again with clearer audio.",
                latency_ms=int((time.time() - start_time) * 1000)
            )
        
        logger.info(f"[{request.session_id}] Transcribed: {transcription[:100]}")
        
        # Step 2: Analyze sentiment
        logger.info(f"[{request.session_id}] Analyzing sentiment...")
        sentiment_result = await analyze_sentiment(transcription, request.language)
        user_sentiment = sentiment_result.get("sentiment", "neutral")
        context.set_user_sentiment(user_sentiment)
        
        # Step 3: Extract data points
        logger.info(f"[{request.session_id}] Extracting 12+ data points...")
        extraction_result = await extract_data(transcription, request.language)
        
        # Add extracted data to context
        extracted_dict = extraction_result.get("extracted", {})
        for key, value in extracted_dict.items():
            if value:
                category = _get_category(key)
                context.add_extracted_data(category, key, str(value), confidence=0.85)
        
        # Add message to context
        context.add_message("user", transcription, user_sentiment)
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        logger.info(f"[{request.session_id}] Analysis complete in {latency_ms}ms")
        
        return VoiceChunkResponse(
            success=True,
            transcription=transcription,
            user_sentiment=user_sentiment,
            sentiment_confidence=sentiment_result.get("confidence", 0.0),
            extracted_data=extracted_dict,
            data_coverage=extraction_result.get("coverage", 0.0),
            conversation_turn=context.turn_count,
            session_summary={
                "total_turns": context.turn_count,
                "data_points_extracted": len(context.data_points),
                "sentiment_trend": context.user_sentiment_trend[-5:] if context.user_sentiment_trend else [],
                "missing_categories": context.get_missing_categories()
            },
            latency_ms=latency_ms
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice processing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Voice processing failed: {str(e)}")


@router.post("/sentiment-analysis")
async def analyze_sentiment_endpoint(request: SentimentAnalysisRequest) -> Dict[str, Any]:
    """
    Analyze sentiment of provided text
    
    **Returns:**
    - sentiment: excited | confused | hesitant | neutral | interested
    - confidence: 0.0 - 1.0
    - label: POSITIVE | NEUTRAL | NEGATIVE
    - keywords_detected: List of sentiment-carrying words
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    
    try:
        result = await analyze_sentiment(request.text, request.language)
        return result
    except Exception as e:
        logger.error(f"Sentiment analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-data")
async def extract_data_endpoint(request: DataExtractionRequest) -> Dict[str, Any]:
    """
    Extract 12+ data points from text
    
    **Categories extracted:**
    - Personal: name, phone, email, location (4)
    - Academic: education_level, field, institution, gpa (4)
    - Preferences: target_countries, course_interest, intake (3)
    - Test Status: test_scores, preparation (2)
    - Financial: budget, scholarship_interest (2)
    - Timeline: application_timeline (1)
    
    **Returns:**
    - extracted: Dict of all extracted values
    - coverage: Percentage of total fields extracted
    - count: Number of fields extracted
    - missing_categories: Which categories need follow-up
    """
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    
    try:
        result = await extract_data(request.text, request.language)
        return result
    except Exception as e:
        logger.error(f"Data extraction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{session_id}")
async def get_session_context(session_id: str) -> Dict[str, Any]:
    """Get conversation context and summary for a session"""
    from src.services.voice_agent.context import _contexts
    
    context = _contexts.get(session_id)
    if not context:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": session_id,
        "language": context.language,
        "turns": context.turn_count,
        "duration_seconds": (datetime.now() - context.start_time).total_seconds() if context.start_time else 0,
        "latest_sentiment": context.latest_user_sentiment,
        "sentiment_trend": context.user_sentiment_trend,
        "extracted_data_summary": context.get_extracted_summary(),
        "data_points_count": len(context.data_points),
        "missing_categories": context.get_missing_categories(),
        "conversation_preview": [
            {"role": m["role"], "text": m["text"][:100], "sentiment": m.get("sentiment")}
            for m in context.messages[-5:]
        ]
    }


@router.delete("/session/{session_id}")
async def clear_session(session_id: str) -> Dict[str, str]:
    """Clear conversation context for a session"""
    from src.services.voice_agent.context import clear_context
    
    clear_context(session_id)
    return {"status": "Session cleared", "session_id": session_id}


def _get_category(key: str) -> str:
    """Get data category for a given key"""
    category_map = {
        "name": "personal", "phone": "personal", "email": "personal", "location": "personal",
        "education_level": "academic", "field": "academic", "institution": "academic", "gpa": "academic",
        "target_countries": "preferences", "course_interest": "preferences", "intake": "preferences",
        "test_scores": "test_status", "test_preparation": "test_status",
        "budget": "financial", "scholarship_interest": "financial",
        "application_timeline": "timeline"
    }
    return category_map.get(key, "other")


