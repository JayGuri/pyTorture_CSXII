from __future__ import annotations

from typing import Any, Dict, List

from src.models.types import PersonaType


_PERSONA_CONFIGS: Dict[PersonaType, Dict[str, Any]] = {
    PersonaType.HIGHLY_RESEARCHED: {
        "markers": [
            "rank", "top", "best", "qs", "russell", "9 cgpa", "90%",
            "first class", "scholarship", "oxford", "cambridge", "imperial", "ucl",
        ],
        "tone": "Match their drive. Show prestige options, scholarship competitiveness, and career ROI.",
        "extraction_priority": [
            "education.gpa_percentage", "preferences.course_interest",
            "preferences.target_countries", "financial.scholarship_interest",
            "education.institution",
        ],
    },
    PersonaType.ANXIOUS_FIRST_TIMER: {
        "markers": [
            "parent", "safe", "security",
            "worried", "alone", "accommodation", "food", "scared", "risk",
        ],
        "tone": 'Be reassuring and empathetic. Address safety, community, support systems. Use "aap" honorific.',
        "extraction_priority": [
            "financial.budget_range", "location.city",
            "timeline.planned_start", "preferences.course_interest",
        ],
    },
    PersonaType.PROXY_CALLER: {
        "markers": [
            "my son", "my daughter", "beta", "beti", "my child",
            "calling for", "he wants", "she wants", "unke liye",
            "uske liye", "mulasathi", "mulisathi",
        ],
        "tone": (
            "This is a parent calling on behalf of their child. "
            "Speak to the parent directly, use formal honorifics, "
            "address their safety and cost concerns first."
        ),
        "extraction_priority": [
            "name", "education.level", "financial.budget_range",
            "preferences.target_countries",
        ],
    },
    PersonaType.BUDGET_CONSTRAINED: {
        "markers": [
            "affordable", "cheap", "budget", "loan", "emi", "scholarship",
            "part-time", "work", "earn", "cost", "lakh", "save",
        ],
        "tone": "Lead with value-for-money. Share part-time work rights, affordable cities, scholarships first.",
        "extraction_priority": [
            "financial.budget_range", "financial.scholarship_interest",
            "location.city", "preferences.course_interest",
        ],
    },
    PersonaType.RETURNING_DROPOUT: {
        "markers": [
            "career change", "switch", "different field", "experience", "working",
            "years", "job", "promotion", "salary", "growth", "currently working",
        ],
        "tone": "Validate their career transition. Highlight conversion courses, industry placements, ROI.",
        "extraction_priority": [
            "education.field", "education.level", "preferences.course_interest",
            "timeline.planned_start", "financial.budget_range",
        ],
    },
    PersonaType.UNDETERMINED: {
        "markers": [
            "confused", "not sure", "don't know", "which", "options", "compare",
            "help me", "what should", "suggest", "guidance",
        ],
        "tone": "Be patient and guiding. Narrow down options step by step. Don't overwhelm.",
        "extraction_priority": [
            "education.level", "education.field",
            "preferences.target_countries", "timeline.planned_start",
        ],
    },
}


def detect_persona(
    history: List[Dict[str, str]],
    current_text: str,
) -> PersonaType:
    full_text = " ".join(
        [h.get("content", "") for h in history] + [current_text]
    ).lower()

    best_persona: PersonaType = PersonaType.UNDETERMINED
    best_score = 0

    for persona, config in _PERSONA_CONFIGS.items():
        score = sum(1 for m in config["markers"] if m in full_text)
        if score > best_score:
            best_score = score
            best_persona = persona

    return best_persona


def get_persona_instructions(persona: PersonaType) -> str:
    config = _PERSONA_CONFIGS[persona]
    return (
        f"CALLER PERSONA: {persona.value}\n"
        f"TONE: {config['tone']}\n"
        f"EXTRACTION PRIORITY: {', '.join(config['extraction_priority'])}"
    )
