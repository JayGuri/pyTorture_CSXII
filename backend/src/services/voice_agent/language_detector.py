from __future__ import annotations

from typing import Dict

from src.models.types import Language

HINDI_TOKENS = {
    "hai", "hoon", "mein", "karna", "chahiye", "aur", "mujhe", "kya", "bhi",
    "se", "par", "ke", "ka", "ki", "ko", "ek", "do", "theek", "nahi", "haan",
    "lekin", "phir", "abhi", "bahut", "accha", "thoda", "sirf", "toh",
    "unka", "mera", "tera", "hamara", "waha", "yaha", "kitna", "kuch",
}

MARATHI_TOKENS = {
    "ahe", "mi", "mula", "karta", "pahije", "ani", "mala", "kay", "pan",
    "che", "te", "ya", "hi", "ek", "don", "thik", "nahi", "ho", "jar",
    "asa", "tasa", "tyacha", "mazha", "tumcha", "tithe", "ithe", "kiti",
    "kahi", "fakt", "tr", "mhanje", "navha", "zale", "zhale",
}


def detect_language_from_text(text: str) -> Language:
    words = text.lower().split()
    total = len(words) or 1

    hi_count = sum(1 for w in words if w in HINDI_TOKENS)
    mr_count = sum(1 for w in words if w in MARATHI_TOKENS)

    hi_ratio = hi_count / total
    mr_ratio = mr_count / total

    if mr_ratio > 0.15:
        return "mr-IN"
    if hi_ratio > 0.08:
        return "hi-IN"

    return "en-IN"


# Language display names
LANGUAGE_NAMES: Dict[Language, str] = {
    "en-IN": "English",
    "hi-IN": "Hindi",
    "mr-IN": "Marathi",
}

# Language-specific prompt instructions
LANGUAGE_INSTRUCTIONS: Dict[Language, str] = {
    "en-IN": "Respond in clear, warm, professional English.",
    "hi-IN": (
        "Respond in natural Hinglish (Hindi-English code-switch). Mirror the student's language blend. "
        "RULE: University names, course names, city names, test names (IELTS, PTE, TOEFL, GPA, CGPA), "
        "numerical figures, and technical terms MUST remain in English. "
        'Example: "Manchester mein MSc Data Science ka tuition fee around £18,000 per year hai."'
    ),
    "mr-IN": (
        "Respond in natural Marathlish (Marathi-English code-switch). Mirror the student's language blend. "
        "RULE: University names, course names, city names, test names, and numbers stay in English. "
        'Example: "Manchester madhe MSc Data Science cha tuition fee £18,000 per year ahe."'
    ),
}
