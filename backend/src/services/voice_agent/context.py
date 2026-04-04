"""
Voice Agent Conversation Context Manager
Maintains multi-turn conversation state and extracted data points
"""

from datetime import datetime
from typing import Optional, Dict, List, Any
from pydantic import BaseModel, Field


class ExtractedDataPoint(BaseModel):
    """Represents an extracted data point from conversation"""
    category: str  # personal, academic, preferences, test_status, financial, timeline
    key: str  # field name
    value: str
    confidence: float  # 0.0-1.0
    extracted_at: datetime
    turn_number: int


class ConversationContext(BaseModel):
    """Maintains session state for a voice conversation"""
    session_id: str
    user_id: Optional[str] = None
    language: str = "en"  # en, hi, mr
    turn_count: int = 0
    start_time: Optional[datetime] = None
    last_interaction: Optional[datetime] = None

    # Extracted data points (minimum 12 required)
    extracted_data: Dict[str, Any] = Field(default_factory=dict)  # Flat dict of extracted values
    data_points: List[ExtractedDataPoint] = Field(default_factory=list)

    # Conversation memory
    messages: List[Dict[str, str]] = Field(default_factory=list)  # [{"role": "user|assistant", "text": "...", "sentiment": "..."}]

    # Sentiment tracking
    user_sentiment_trend: List[str] = Field(default_factory=list)  # Track sentiment over conversation
    latest_user_sentiment: Optional[str] = None  # excited, confused, hesitant, neutral, interested

    # Context for follow-up questions
    answered_topics: set = Field(default_factory=set)
    pending_clarifications: List[str] = Field(default_factory=list)
    
    class Config:
        arbitrary_types_allowed = True

    def add_message(self, role: str, text: str, sentiment: Optional[str] = None):
        """Add a message to conversation history with sentiment"""
        self.turn_count += 1
        self.last_interaction = datetime.now()
        self.messages.append({
            "role": role,
            "text": text,
            "sentiment": sentiment,
            "turn": self.turn_count,
            "timestamp": self.last_interaction.isoformat()
        })

    def add_extracted_data(self, category: str, key: str, value: str, confidence: float = 0.9):
        """Add extracted data point to context"""
        self.extracted_data[key] = value
        self.data_points.append(ExtractedDataPoint(
            category=category,
            key=key,
            value=value,
            confidence=confidence,
            extracted_at=datetime.now(),
            turn_number=self.turn_count
        ))

    def set_user_sentiment(self, sentiment: str):
        """Track user sentiment through conversation"""
        self.latest_user_sentiment = sentiment
        if sentiment not in self.user_sentiment_trend:
            self.user_sentiment_trend.append(sentiment)

    def get_extracted_summary(self) -> Dict[str, Any]:
        """Return all extracted data organized by category"""
        summary = {
            "personal": {},
            "academic": {},
            "preferences": {},
            "test_status": {},
            "financial": {},
            "timeline": {}
        }
        
        for point in self.data_points:
            if point.category in summary:
                summary[point.category][point.key] = {
                    "value": point.value,
                    "confidence": point.confidence,
                    "extracted_at": point.extracted_at.isoformat()
                }
        
        return summary

    def get_missing_categories(self) -> List[str]:
        """Identify which data categories have no extracted data"""
        categories = ["personal", "academic", "preferences", "test_status", "financial", "timeline"]
        extracted_categories = set(point.category for point in self.data_points)
        return [c for c in categories if c not in extracted_categories]

    def get_conversation_summary(self) -> str:
        """Get a brief summary of conversation so far"""
        return f"Turn {self.turn_count} | Sentiment: {self.latest_user_sentiment} | Data points: {len(self.data_points)}/12"


# Storage for conversation contexts (in-memory for now; can use Redis)
_contexts: Dict[str, ConversationContext] = {}


def get_or_create_context(session_id: str, language: str = "en", user_id: Optional[str] = None) -> ConversationContext:
    """Get existing context or create new one"""
    if session_id not in _contexts:
        _contexts[session_id] = ConversationContext(
            session_id=session_id,
            language=language,
            user_id=user_id,
            start_time=datetime.now()
        )
    return _contexts[session_id]


def clear_context(session_id: str):
    """Clear conversation context"""
    if session_id in _contexts:
        del _contexts[session_id]
