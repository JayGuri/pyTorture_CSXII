"""
Transcription Analysis API Routes

REST API for analyzing call transcripts using NLP to extract sentiment, intent, and emotional state.
Used by admin dashboard to provide call insights and recommendations.
"""

import asyncio
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from src.db.mongo_client import get_db
from src.models.responses import DataResponse
from src.services.transcription_nlp_analyzer import analyze_transcription_sync
from src.utils.logger import logger

router = APIRouter(prefix="/api/transcription")


class TranscriptionAnalysisRequest(BaseModel):
    """Request model for transcription analysis"""

    text: str
    use_transformers: bool = False


class TranscriptionAnalysisResponse(BaseModel):
    """Response model for transcription analysis"""

    sentiment: str
    emotional_state: str
    intent: str
    confidence: float
    sentiment_confidence: float
    intent_confidence: float
    detected_keywords: list
    emotional_keywords: list
    suggested_tone: dict
    response_recommendations: dict
    language: str
    timestamp: str


@router.post("/analyze")
async def analyze_transcript(request: TranscriptionAnalysisRequest):
    """
    Analyze transcription text for sentiment, intent, and emotional state.

    **Request:**
    ```json
    {
      "text": "I'm confused about visa fees and scholarships",
      "use_transformers": false
    }
    ```

    **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "sentiment": "confused",
        "emotional_state": "confused",
        "intent": "visa_inquiry",
        "confidence": 0.85,
        ...
      }
    }
    ```

    Args:
        request: TranscriptionAnalysisRequest with text to analyze

    Returns:
        DataResponse containing TranscriptionAnalysisResult
    """
    try:
        if not request.text or not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        # Analyze the transcription in a thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            analyze_transcription_sync,
            request.text,
            request.use_transformers
        )

        logger.info(
            f"Transcription analyzed: sentiment={result.sentiment}, intent={result.intent}"
        )

        return DataResponse(
            status="success",
            data={
                "sentiment": result.sentiment,
                "emotional_state": result.emotional_state,
                "intent": result.intent,
                "confidence": result.confidence,
                "sentiment_confidence": result.sentiment_confidence,
                "intent_confidence": result.intent_confidence,
                "detected_keywords": result.detected_keywords,
                "emotional_keywords": result.emotional_keywords,
                "suggested_tone": result.suggested_tone,
                "response_recommendations": result.response_recommendations,
                "language": result.language,
                "timestamp": result.timestamp,
            },
        )

    except ValueError as e:
        logger.error(f"Validation error in transcription analysis: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error analyzing transcription: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze transcription")


@router.post("/analyze-call/{call_sid}")
async def analyze_call_transcript(call_sid: str, use_transformers: bool = Query(False)):
    """
    Analyze a call's transcript from MongoDB by call_sid.

    Fetches the call from the callers collection and analyzes its transcript messages.

    **Response:**
    ```json
    {
      "status": "success",
      "data": {
        "call_sid": "CA1234567890abcdef",
        "sentiment": "excited",
        "emotional_state": "excited",
        "intent": "scholarship_inquiry",
        ...
      }
    }
    ```

    Args:
        call_sid: The Twilio call SID
        use_transformers: Whether to use transformer models (slower but more accurate)

    Returns:
        DataResponse containing analysis result with call_sid

    Raises:
        HTTPException: If call not found or no transcript available
    """
    try:
        db = get_db()

        # Find the lead/caller that contains this call (Motor is async!)
        caller = await db.callers.find_one(
            {"calls.call_sid": call_sid},
            {"calls.$": 1, "memory.messages": 1, "_id": 0}
        )

        if not caller or not caller.get("calls"):
            raise HTTPException(status_code=404, detail=f"Call {call_sid} not found")

        messages = caller.get("memory", {}).get("messages", [])

        if not messages:
            raise HTTPException(
                status_code=400,
                detail=f"No transcript available for call {call_sid}"
            )

        # Combine all messages into a single text
        transcript_text = " ".join(
            [msg.get("content") or msg.get("text", "") for msg in messages if msg]
        )

        if not transcript_text.strip():
            raise HTTPException(
                status_code=400,
                detail=f"Call transcript is empty for {call_sid}"
            )

        # Analyze the transcript in a thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            analyze_transcription_sync,
            transcript_text,
            use_transformers
        )

        logger.info(
            f"Call {call_sid} analyzed: sentiment={result.sentiment}, intent={result.intent}"
        )

        return DataResponse(
            status="success",
            data={
                "call_sid": call_sid,
                "sentiment": result.sentiment,
                "emotional_state": result.emotional_state,
                "intent": result.intent,
                "confidence": result.confidence,
                "sentiment_confidence": result.sentiment_confidence,
                "intent_confidence": result.intent_confidence,
                "detected_keywords": result.detected_keywords,
                "emotional_keywords": result.emotional_keywords,
                "suggested_tone": result.suggested_tone,
                "response_recommendations": result.response_recommendations,
                "language": result.language,
                "timestamp": result.timestamp,
                "message_count": len(messages),
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error analyzing call {call_sid} transcript: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to analyze call transcript: {str(e)}")
