from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

INTENT_PATTERNS = {
    "visa_inquiry": ["visa", "ukvi", "ihs", "proof", "fund", "व्हिसा", "फंड", "वीज़ा", "फीस"],
    "cost_inquiry": ["fee", "fees", "cost", "budget", "rupee", "lakh", "खर्च", "बजट", "फीस", "लाख"],
    "scholarship_inquiry": ["scholarship", "chevening", "great", "funding", "शिष्यवृत्ति", "स्कॉलरशिप"],
    "test_inquiry": ["ielts", "pte", "toefl", "band", "स्कोर", "आयल्ट्स"],
    "university_inquiry": ["university", "college", "course", "masters", "msc", "mba", "यूनिवर्सिटी", "कॉलेज"],
    "timeline_inquiry": ["intake", "deadline", "sept", "jan", "timeline", "इंटेक", "डेडलाइन"],
}

POSITIVE_SIGNALS = [
    "yes",
    "ready",
    "confident",
    "interested",
    "great",
    "haan",
    "ha",
    "हो",
    "होय",
    "चालेल",
]
NEGATIVE_SIGNALS = [
    "no",
    "not",
    "confused",
    "worried",
    "problem",
    "nahi",
    "नाही",
    "नहीं",
    "दिक्कत",
    "परेशान",
]


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _classify_intent(text: str) -> str:
    normalized = _normalize(text)
    best_intent = "general_query"
    best_score = 0

    for intent, patterns in INTENT_PATTERNS.items():
        score = sum(1 for token in patterns if token in normalized)
        if score > best_score:
            best_intent = intent
            best_score = score

    return best_intent


def _classify_sentiment(text: str) -> str:
    normalized = _normalize(text)
    positive = sum(1 for token in POSITIVE_SIGNALS if token in normalized)
    negative = sum(1 for token in NEGATIVE_SIGNALS if token in normalized)
    if positive > negative:
        return "positive"
    if negative > positive:
        return "negative"
    return "neutral"


def _extract_entities(text: str) -> dict[str, Any]:
    entities: dict[str, Any] = {
        "budget_mentions": [],
        "test_scores": [],
        "intake_mentions": [],
    }

    entities["budget_mentions"] = re.findall(
        r"(?:₹|rs\.?|rupees?)\s?[\d,]+(?:\.\d+)?|\b\d+\s?(?:lakh|lakhs|lac|lacs|crore|crores)\b",
        text,
        flags=re.IGNORECASE,
    )

    entities["test_scores"] = [
        f"{exam.upper()} {score}"
        for exam, score in re.findall(r"\b(ielts|pte|toefl)\s*(\d+(?:\.\d+)?)\b", text, flags=re.IGNORECASE)
    ]

    entities["intake_mentions"] = re.findall(
        r"\b(january|jan|february|march|april|may|june|july|august|september|sept|october|november|december|2026|2027)\b",
        text,
        flags=re.IGNORECASE,
    )

    return entities


def analyze_transcript(transcript: str, language_code: str) -> dict[str, Any]:
    transcript = transcript.strip()
    analysis = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "language": language_code,
        "word_count": len(transcript.split()),
        "intent": _classify_intent(transcript),
        "sentiment": _classify_sentiment(transcript),
        "entities": _extract_entities(transcript),
    }
    return analysis
