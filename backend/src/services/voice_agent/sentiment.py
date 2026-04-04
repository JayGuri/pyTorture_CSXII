"""
Sentiment Analysis Service
Analyzes user sentiment in real-time using HuggingFace models with multi-language support.

BUG-2 fix: model loading is wrapped in asyncio.to_thread so it never blocks
the event loop.  Until the models finish loading, all inference falls back
to the fast, rule-based keyword approach.
"""

from typing import Dict, Optional, List
import asyncio
import logging

logger = logging.getLogger(__name__)


class SentimentAnalyzer:
    """Multi-language sentiment analyzer with async model warm-up."""

    # Sentiment mapping for educational context
    SENTIMENT_MAP = {
        "positive": "excited",
        "neutral": "neutral",
        "negative": "hesitant",
    }

    CONTEXT_KEYWORDS: Dict[str, List[str]] = {
        "excited":    ["interested", "amazing", "love", "want", "great", "excited", "wow"],
        "confused":   ["confusion", "confuse", "what", "how", "don't understand", "unclear", "ambiguous"],
        "hesitant":   ["not sure", "maybe", "worried", "concern", "afraid", "difficult", "hard"],
        "interested": ["interested", "tell", "explain", "curious", "know more"],
        "neutral":    [],
    }

    def __init__(self) -> None:
        """Lightweight init — NO heavy model loads here."""
        self.en_sentiment = None
        self.multilingual_sentiment = None
        self._ready = False
        self._warmup_started = False

    # ── Async warm-up (runs in a thread) ──────────────────
    async def warm_up(self) -> None:
        """Load transformer pipelines off the event loop."""
        if self._ready or self._warmup_started:
            return
        self._warmup_started = True
        try:
            await asyncio.to_thread(self._load_models_sync)
        except Exception as exc:
            logger.error(f"Sentiment model warm-up failed: {exc}")

    def _load_models_sync(self) -> None:
        """Called inside a worker thread."""
        from transformers import pipeline  # local import to avoid top-level cost

        try:
            self.en_sentiment = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                device=-1,
            )
            self.multilingual_sentiment = pipeline(
                "sentiment-analysis",
                model="xlm-roberta-base",
                device=-1,
            )
            self._ready = True
            logger.info("✅ Sentiment analyzers loaded successfully")
        except Exception as exc:
            logger.error(f"❌ Failed to load sentiment models: {exc}")

    # ── Public API ────────────────────────────────────────
    async def analyze(self, text: str, language: str = "en") -> Dict[str, object]:
        if not text or not text.strip():
            return {"sentiment": "neutral", "confidence": 0.0, "label": "NEUTRAL", "score": 0.0}

        # If models aren't ready yet, use fast rule-based path
        if not self._ready:
            return self._rule_based_analyze(text, language)

        try:
            result = await asyncio.to_thread(self._analyze_sync, text, language)
            return result
        except Exception as exc:
            logger.error(f"Sentiment analysis error: {exc}")
            return self._rule_based_analyze(text, language)

    # ── Rule-based fallback (< 1 ms, no model needed) ────
    def _rule_based_analyze(self, text: str, language: str) -> Dict[str, object]:
        fine_grained = self._detect_context_sentiment(text.lower(), language)
        keywords = self._extract_keywords(text, language)

        sentiment = fine_grained or "neutral"
        label_map = {"excited": "POSITIVE", "interested": "POSITIVE",
                      "confused": "NEGATIVE", "hesitant": "NEGATIVE",
                      "neutral": "NEUTRAL"}
        label = label_map.get(sentiment, "NEUTRAL")

        return {
            "sentiment": sentiment,
            "confidence": 0.65,
            "label": label,
            "score": 0.65,
            "language": language,
            "keywords_detected": keywords,
            "context_sentiment": fine_grained,
            "method": "rule_based",
        }

    # ── Sync inference (called in thread) ─────────────────
    def _analyze_sync(self, text: str, language: str = "en") -> Dict[str, object]:
        model = (
            self.multilingual_sentiment if language in ("hi", "mr")
            else self.en_sentiment
        )
        if not model:
            return self._rule_based_analyze(text, language)

        results = model(text[:512])
        if not isinstance(results, list) or not results:
            return self._rule_based_analyze(text, language)

        first_result = results[0]
        if not isinstance(first_result, dict):
            return self._rule_based_analyze(text, language)

        label = str(first_result.get("label", "NEUTRAL")).upper()
        score = float(first_result.get("score", 0.0))

        mapped_sentiment = self.SENTIMENT_MAP.get(label.lower(), "neutral")
        fine_grained = self._detect_context_sentiment(text.lower(), language)

        return {
            "sentiment": fine_grained or mapped_sentiment,
            "confidence": score,
            "label": label,
            "score": score,
            "language": language,
            "keywords_detected": self._extract_keywords(text, language),
            "context_sentiment": fine_grained,
            "method": "model",
        }

    # ── Keyword helpers ───────────────────────────────────
    def _detect_context_sentiment(self, text: str, language: str) -> Optional[str]:
        text_lower = text.lower()
        for sentiment, keywords in self.CONTEXT_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                return sentiment
        return None

    def _extract_keywords(self, text: str, language: str) -> list:
        keywords: list[str] = []
        all_kws: list[str] = []
        for kw_list in self.CONTEXT_KEYWORDS.values():
            all_kws.extend(kw_list)
        text_lower = text.lower()
        for kw in all_kws:
            if kw in text_lower:
                keywords.append(kw)
        return keywords[:5]


# ── Singleton ─────────────────────────────────────────────
_analyzer: Optional[SentimentAnalyzer] = None


def get_sentiment_analyzer() -> SentimentAnalyzer:
    """Get or create the global analyzer (models may still be loading)."""
    global _analyzer
    if _analyzer is None:
        _analyzer = SentimentAnalyzer()
    return _analyzer


async def analyze_sentiment(text: str, language: str = "en") -> Dict[str, object]:
    """Convenience function for sentiment analysis."""
    analyzer = get_sentiment_analyzer()
    return await analyzer.analyze(text, language)
