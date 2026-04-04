from __future__ import annotations

import re
from typing import Dict, List

from src.models.types import AnalysisResult, IntentClass, Language, Sentiment

INTENT_PATTERNS: Dict[IntentClass, List[str]] = {
    "visa_inquiry": ["visa", "ukvi", "ihs", "proof", "fund", "व्हिसा", "फंड", "वीज़ा", "फीस", "immigration", "passport"],
    "cost_inquiry": ["fee", "fees", "cost", "budget", "rupee", "lakh", "खर्च", "बजट", "फीस", "लाख", "kitna", "price", "expensive", "cheap", "paisa", "afford"],
    "scholarship_inquiry": ["scholarship", "chevening", "great", "funding", "शिष्यवृत्ती", "स्कॉलरशिप", "merit", "bursary"],
    "ielts_pte_inquiry": ["ielts", "pte", "toefl", "band", "स्कोर", "आयल्ट्स", "english test", "score"],
    "university_inquiry": ["university", "college", "ranking", "rank", "apply", "admission", "uni", "यूनिवर्सिटी", "कॉलेज", "russell group"],
    "course_inquiry": ["msc", "mba", "course", "program", "data science", "computer science", "mtech", "masters", "degree", "btech"],
    "ireland_inquiry": ["ireland", "dublin", "cork", "galway", "limerick", "tcd", "ucd"],
    "post_study_work": ["graduate route", "psw", "post study", "stay back", "work after", "remain", "settle"],
    "loan_inquiry": ["loan", "borrow", "sbi", "hdfc", "prodigy", "mpower", "education loan", "emi"],
    "document_inquiry": ["document", "sop", "lor", "transcript", "what do i need", "application", "reference letter", "resume", "cv"],
    "profile_collection": [],
    "general_query": [],
}

POSITIVE_SIGNALS = [
    "yes", "ready", "confident", "interested", "great", "haan", "ha",
    "हो", "होय", "चालेल", "perfect", "okay", "sure", "definitely",
]

NEGATIVE_SIGNALS = [
    "no", "not", "confused", "worried", "problem", "nahi", "नाही",
    "नहीं", "दिक्कत", "परेशान", "can't", "difficult", "scared",
]

# Redis cache keys each intent needs
INTENT_CACHE_MAP: Dict[str, List[str]] = {
    "cost_inquiry": ["fx:gbp_inr", "fx:eur_inr", "visa:london_monthly", "visa:outside_monthly"],
    "university_inquiry": ["intake:uk_sep", "intake:uk_jan"],
    "visa_inquiry": ["visa:uk_fee_gbp", "visa:ihs_per_year", "visa:london_monthly"],
    "ielts_pte_inquiry": ["ielts:fee_inr"],
    "scholarship_inquiry": ["fx:gbp_inr"],
    "post_study_work": [],
    "course_inquiry": ["intake:uk_sep", "intake:uk_jan"],
    "ireland_inquiry": ["fx:eur_inr", "visa:ie_fee_eur", "intake:ie_sep"],
    "document_inquiry": [],
    "loan_inquiry": ["fx:gbp_inr"],
    "profile_collection": [],
    "general_query": [],
}


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def classify_intent(text: str) -> IntentClass:
    normalized = _normalize(text)
    best_intent: IntentClass = "general_query"
    best_score = 0

    for intent, patterns in INTENT_PATTERNS.items():
        if not patterns:
            continue
        score = sum(1 for token in patterns if token in normalized)
        if score > best_score:
            best_intent = intent  # type: ignore
            best_score = score

    return best_intent


def classify_sentiment(text: str) -> Sentiment:
    normalized = _normalize(text)
    positive = sum(1 for t in POSITIVE_SIGNALS if t in normalized)
    negative = sum(1 for t in NEGATIVE_SIGNALS if t in normalized)

    if positive > negative:
        return "positive"
    if negative > positive:
        return "negative"
    return "neutral"


def extract_entities(text: str) -> Dict[str, List[str]]:
    entities: Dict[str, List[str]] = {
        "budget_mentions": [],
        "test_scores": [],
        "intake_mentions": [],
    }

    # Budget mentions
    budget_matches = re.findall(
        r"(?:₹|rs\.?|rupees?)\s?[\d,]+(?:\.\d+)?|\b\d+\s?(?:lakh|lakhs|lac|lacs|crore|crores)\b",
        text,
        re.IGNORECASE,
    )
    if budget_matches:
        entities["budget_mentions"] = budget_matches

    # Test scores
    for match in re.finditer(r"\b(ielts|pte|toefl)\s*(\d+(?:\.\d+)?)\b", text, re.IGNORECASE):
        entities["test_scores"].append(f"{match.group(1).upper()} {match.group(2)}")

    # Intake mentions
    intake_matches = re.findall(
        r"\b(january|jan|february|march|april|may|june|july|august|september|sept|october|november|december|2025|2026|2027)\b",
        text,
        re.IGNORECASE,
    )
    if intake_matches:
        entities["intake_mentions"] = intake_matches

    return entities


def analyze_transcript(transcript: str, language_code: Language) -> AnalysisResult:
    return AnalysisResult(
        intent=classify_intent(transcript),
        sentiment=classify_sentiment(transcript),
        entities=extract_entities(transcript),
        word_count=len(transcript.strip().split()),
        language=language_code,
    )
