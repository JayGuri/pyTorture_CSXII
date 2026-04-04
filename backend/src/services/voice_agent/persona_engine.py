from __future__ import annotations

from typing import Any, Dict, List, Literal

PersonaType = Literal[
    "ambitious_topper",
    "anxious_parent",
    "budget_conscious",
    "career_switcher",
    "confused_explorer",
]


_PERSONA_CONFIGS: Dict[PersonaType, Dict[str, Any]] = {
    "ambitious_topper": {
        "markers": [
            "rank", "top", "best", "qs", "russell", "9 cgpa", "90%",
            "first class", "scholarship", "oxford", "cambridge", "imperial", "ucl",
        ],
        "tone": "Match their drive. Show prestige options, scholarship competitiveness, and career ROI.",
        "extraction_priority": ["gpa", "course_interest", "target_countries", "scholarship_interest", "institution"],
    },
    "anxious_parent": {
        "markers": [
            "parent", "beta", "beti", "son", "daughter", "safe", "security",
            "worried", "alone", "accommodation", "food", "scared", "risk",
        ],
        "tone": 'Be reassuring and empathetic. Address safety, community, support systems. Use "aap" honorific.',
        "extraction_priority": ["budget_range", "location", "timeline", "course_interest"],
    },
    "budget_conscious": {
        "markers": [
            "affordable", "cheap", "budget", "loan", "emi", "scholarship",
            "part-time", "work", "earn", "cost", "lakh", "save",
        ],
        "tone": "Lead with value-for-money. Share part-time work rights, affordable cities, scholarships first.",
        "extraction_priority": ["budget_range", "scholarship_interest", "location", "course_interest"],
    },
    "career_switcher": {
        "markers": [
            "career change", "switch", "different field", "experience", "working",
            "years", "job", "promotion", "salary", "growth", "currently working",
        ],
        "tone": "Validate their career transition. Highlight conversion courses, industry placements, ROI.",
        "extraction_priority": ["field", "education_level", "course_interest", "timeline", "budget_range"],
    },
    "confused_explorer": {
        "markers": [
            "confused", "not sure", "don't know", "which", "options", "compare",
            "help me", "what should", "suggest", "guidance",
        ],
        "tone": "Be patient and guiding. Narrow down options step by step. Don't overwhelm.",
        "extraction_priority": ["education_level", "field", "target_countries", "timeline"],
    },
}


def detect_persona(
    history: List[Dict[str, str]],
    current_text: str,
) -> PersonaType:
    full_text = " ".join(
        [h.get("content", "") for h in history] + [current_text]
    ).lower()

    best_persona: PersonaType = "confused_explorer"
    best_score = 0

    for persona, config in _PERSONA_CONFIGS.items():
        score = sum(1 for m in config["markers"] if m in full_text)
        if score > best_score:
            best_score = score
            best_persona = persona  # type: ignore

    return best_persona


def get_persona_instructions(persona: PersonaType) -> str:
    config = _PERSONA_CONFIGS[persona]
    return (
        f"CALLER PERSONA: {persona.replace('_', ' ')}\n"
        f"TONE: {config['tone']}\n"
        f"EXTRACTION PRIORITY: {', '.join(config['extraction_priority'])}"
    )
