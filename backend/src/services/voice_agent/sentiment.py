"""
Sentiment Analysis Service
Analyzes user sentiment in real-time using HuggingFace models with multi-language support
"""

from typing import Dict, Tuple, Optional
import asyncio
from functools import lru_cache
from transformers import pipeline
import logging

logger = logging.getLogger(__name__)


class SentimentAnalyzer:
    """Multi-language sentiment analyzer"""
    
    # Sentiment mapping for educational context
    SENTIMENT_MAP = {
        "positive": "excited",
        "neutral": "neutral",
        "negative": "hesitant"
    }

    CONTEXT_KEYWORDS = {
        "excited": ["interested", "amazing", "love", "want", "great", "excited", "wow", "great"],
        "confused": ["confusion", "confuse", "what", "how", "don't understand", "unclear", "ambiguous"],
        "hesitant": ["not sure", "maybe", "worried", "concern", "afraid", "difficult", "hard"],
        "interested": ["interested", "tell", "explain", "curious", "know more"],
        "neutral": []
    }

    def __init__(self):
        """Initialize sentiment analysis models"""
        try:
            # English sentiment analyzer
            self.en_sentiment = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                device=-1  # CPU
            )
            
            # Multi-lingual model for Hindi/Marathi support
            self.multilingual_sentiment = pipeline(
                "sentiment-analysis",
                model="xlm-roberta-base",
                device=-1
            )
            
            logger.info("✅ Sentiment analyzers loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load sentiment models: {e}")
            self.en_sentiment = None
            self.multilingual_sentiment = None

    async def analyze(self, text: str, language: str = "en") -> Dict[str, any]:
        """
        Analyze sentiment of text with language-specific handling
        
        Args:
            text: Input text to analyze
            language: Language code (en, hi, mr)
            
        Returns:
            {
                "sentiment": "excited|confused|hesitant|neutral|interested",
                "confidence": 0.0-1.0,
                "label": "POSITIVE|NEUTRAL|NEGATIVE",
                "score": 0.0-1.0,
                "language": language,
                "keywords_detected": [...]
            }
        """
        
        if not text or not text.strip():
            return {"sentiment": "neutral", "confidence": 0.0, "label": "NEUTRAL", "score": 0.0}

        try:
            # Run in thread pool to avoid blocking
            result = await asyncio.to_thread(self._analyze_sync, text, language)
            return result
        except Exception as e:
            logger.error(f"Sentiment analysis error: {e}")
            return {"sentiment": "neutral", "confidence": 0.5, "label": "NEUTRAL", "score": 0.5, "error": str(e)}

    def _analyze_sync(self, text: str, language: str = "en") -> Dict[str, any]:
        """Synchronous sentiment analysis"""
        
        # Use language-specific model
        if language in ["hi", "mr"]:  # Hindi, Marathi
            model = self.multilingual_sentiment
        else:  # English
            model = self.en_sentiment

        if not model:
            return {"sentiment": "neutral", "confidence": 0.5}

        # Perform sentiment analysis
        results = model(text[:512])  # Truncate to model's max length
        
        if not results:
            return {"sentiment": "neutral", "confidence": 0.5}

        result = results[0]
        label = result.get("label", "NEUTRAL").upper()
        score = float(result.get("score", 0.0))

        # Map to educational context sentiment
        mapped_sentiment = self.SENTIMENT_MAP.get(label.lower(), "neutral")

        # Detect context-specific keywords for fine-grained sentiment
        fine_grained = self._detect_context_sentiment(text.lower(), language)

        # Create response
        return {
            "sentiment": fine_grained or mapped_sentiment,
            "confidence": score,
            "label": label,
            "score": score,
            "language": language,
            "keywords_detected": self._extract_keywords(text, language),
            "context_sentiment": fine_grained
        }

    def _detect_context_sentiment(self, text: str, language: str) -> Optional[str]:
        """Detect sentiment based on context keywords"""
        
        text_lower = text.lower()
        
        # Check for context-specific patterns
        for sentiment, keywords in self.CONTEXT_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                return sentiment
        
        return None

    def _extract_keywords(self, text: str, language: str) -> list:
        """Extract sentiment-relevant keywords from text"""
        keywords = []
        all_keywords = []
        
        for sentiment_keywords in self.CONTEXT_KEYWORDS.values():
            all_keywords.extend(sentiment_keywords)
        
        text_lower = text.lower()
        for keyword in all_keywords:
            if keyword in text_lower:
                keywords.append(keyword)
        
        return keywords[:5]  # Return top 5 keywords


# Global analyzer instance
_analyzer: Optional[SentimentAnalyzer] = None


def get_sentiment_analyzer() -> SentimentAnalyzer:
    """Get or initialize global sentiment analyzer"""
    global _analyzer
    if _analyzer is None:
        _analyzer = SentimentAnalyzer()
    return _analyzer


async def analyze_sentiment(text: str, language: str = "en") -> Dict[str, any]:
    """Convenience function for sentiment analysis"""
    analyzer = get_sentiment_analyzer()
    return await analyzer.analyze(text, language)
