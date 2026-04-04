from __future__ import annotations

import re
from typing import List, Optional, Tuple

from src.models.types import (
    BudgetStatus,
    EmotionalState,
    EmotionLevel,
    ExtractedData,
    FinancialData,
    InferredFrom,
    LocationData,
    EducationData,
    PreferencesData,
    TestStage,
    TestStatusData,
    TimelineData,
)


# ── Area-code → city lookup (for caller-ID inference) ────
_AREA_CODE_MAP = {
    "022": "Mumbai", "020": "Pune", "011": "Delhi",
    "080": "Bangalore", "040": "Hyderabad", "044": "Chennai",
    "033": "Kolkata", "079": "Ahmedabad", "0141": "Jaipur",
    "0712": "Nagpur", "0253": "Nashik",
}

_CITIES = [
    "mumbai", "pune", "delhi", "bangalore", "hyderabad", "chennai",
    "kolkata", "ahmedabad", "jaipur", "nagpur", "nashik", "thane",
    "navi mumbai", "aurangabad",
]

_FIELDS = {
    "Computer Science": ["computer", "cs", "software", "coding", "programming", "it", "tech"],
    "Data Science":     ["data science", "data analytics", "machine learning", "ml", "ai", "artificial intelligence"],
    "Business":         ["business", "management", "mba", "finance", "marketing", "hr"],
    "Engineering":      ["engineering", "mechanical", "electrical", "civil", "electronics"],
    "Medicine":         ["medicine", "medical", "mbbs", "healthcare", "nursing"],
}

# ── Objection patterns ───────────────────────────────────
_OBJECTION_PATTERNS = [
    (r"\b(expensive|too costly|can't afford|bahut mehenga|paisa nahi)\b",
     "Budget concern: cost too high"),
    (r"\b(visa reject|rejection|refused|decline)\b",
     "Visa concern: fear of rejection"),
    (r"\b(not sure|confused|don't know which|kaunsa)\b",
     "Undecided: needs university/course guidance"),
    (r"\b(parents|family|permission|ghar wale|mummy|papa)\b",
     "Family approval pending"),
    (r"\b(ielts|english test|band)\b.*\b(low|not enough|fail|below)\b",
     "IELTS score below requirement"),
]

# ── Emotion keyword lists ────────────────────────────────
_ANXIETY_HIGH  = ["scared", "worried", "tension", "nervous", "dar lag", "chinta"]
_ANXIETY_LOW   = ["excited", "confident", "ready", "sure", "bilkul"]
_URGENCY_HIGH  = ["asap", "immediately", "this year", "september 2025", "urgent"]
_URGENCY_LOW   = ["someday", "maybe", "thinking", "2027"]
_CONFIDENCE_LOW = ["not sure", "confused", "don't know", "kya karu"]

# ── Completeness lambdas (12 trackable fields) ───────────
_COMPLETENESS_FIELDS = [
    lambda e: e.name,
    lambda e: e.phone,
    lambda e: e.location.city,
    lambda e: e.education.level,
    lambda e: e.education.field,
    lambda e: e.preferences.target_countries,
    lambda e: e.preferences.course_interest,
    lambda e: e.test_status.score,
    lambda e: e.financial.budget_range,
    lambda e: e.preferences.intake_timing,
    lambda e: e.education.gpa_percentage,
    lambda e: e.financial.scholarship_interest,
]


def extract_lead_data_from_text(
    transcript: str,
    existing: Optional[ExtractedData] = None,
) -> Tuple[ExtractedData, List[str], EmotionalState, int]:
    """Extract structured lead data from transcript text.

    Returns:
        (ExtractedData, objections, emotional_state, completeness_count)
    """
    # Start from existing or fresh
    if existing is not None:
        extracted = existing.model_copy(deep=True)
    else:
        extracted = ExtractedData()

    t = transcript.lower()

    # ── Name ──────────────────────────────────────────────
    name_match = re.search(
        r"(?:my name is|i am|i'm|mera naam|naam)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        transcript,
        re.IGNORECASE,
    )
    if name_match and not extracted.name:
        extracted.name = name_match.group(1).strip()

    # ── Email ─────────────────────────────────────────────
    email_match = re.search(r"[\w.-]+@[\w.-]+\.\w+", transcript)
    if email_match and not extracted.email:
        extracted.email = email_match.group(0)

    # ── Location ──────────────────────────────────────────
    if not extracted.location.city:
        # Try transcript first
        for city in _CITIES:
            if city in t:
                extracted.location = LocationData(
                    city=city.capitalize(),
                    inferred_from=InferredFrom.CONVERSATION,
                )
                break
        else:
            # Try caller-ID area code
            if extracted.phone:
                for code, city_name in _AREA_CODE_MAP.items():
                    if extracted.phone.startswith(code):
                        extracted.location = LocationData(
                            city=city_name,
                            inferred_from=InferredFrom.CALLER_ID,
                        )
                        break

    # ── Education level ───────────────────────────────────
    if not extracted.education.level:
        if re.search(r"\b(btech|b\.?tech|bachelor|bsc|b\.?sc|bcom|b\.?com|ba|bba|be|b\.?e)\b", t, re.IGNORECASE):
            extracted.education.level = "Undergraduate"
        elif re.search(r"\b(mtech|m\.?tech|master|msc|m\.?sc|mcom|m\.?com|ma|mba|me|m\.?e|pg|post\s?grad)\b", t, re.IGNORECASE):
            extracted.education.level = "Postgraduate"

    # ── Field of study ────────────────────────────────────
    if not extracted.education.field:
        for field_name, keywords in _FIELDS.items():
            if any(k in t for k in keywords):
                extracted.education.field = field_name
                break

    # ── Target countries ──────────────────────────────────
    countries: List[str] = []
    if re.search(r"\b(uk|united kingdom|england|britain|london|manchester|edinburgh)\b", t, re.IGNORECASE):
        countries.append("UK")
    if re.search(r"\b(ireland|dublin|cork|galway)\b", t, re.IGNORECASE):
        countries.append("Ireland")
    if countries and not extracted.preferences.target_countries:
        extracted.preferences.target_countries = countries

    # ── Test status (IELTS / PTE) ─────────────────────────
    ielts_match = re.search(r"ielts\s*(?:score\s*(?:is\s*)?)?([\d]+(?:\.[\d])?)", t, re.IGNORECASE)
    pte_match   = re.search(r"pte\s*(?:score\s*(?:is\s*)?)?([\d]{2,3})", t, re.IGNORECASE)

    # Stage detection (ordered: explicit "not started" first)
    if re.search(r"\b(not taken|haven't|planning|thinking|will give)\b", t):
        extracted.test_status.stage = TestStage.NOT_STARTED
    elif re.search(r"\b(preparing|studying|coaching|practice|appear)\b", t):
        extracted.test_status.stage = TestStage.PREPARING
    elif ielts_match or pte_match:
        extracted.test_status.stage = TestStage.COMPLETED
        extracted.test_status.exam_type = "IELTS" if ielts_match else "PTE"
        extracted.test_status.score = float((ielts_match or pte_match).group(1))  # type: ignore[union-attr]

    # If a score is mentioned but stage wasn't explicitly set above, mark COMPLETED
    if extracted.test_status.score is None:
        if ielts_match and not extracted.test_status.score:
            extracted.test_status.exam_type = "IELTS"
            extracted.test_status.score = float(ielts_match.group(1))
            extracted.test_status.stage = TestStage.COMPLETED
        elif pte_match and not extracted.test_status.score:
            extracted.test_status.exam_type = "PTE"
            extracted.test_status.score = float(pte_match.group(1))
            extracted.test_status.stage = TestStage.COMPLETED

    # ── GPA ───────────────────────────────────────────────
    gpa_match = re.search(r"(?:gpa|cgpa)\s*(?:is\s*)?([\d]+(?:\.[\d]+)?)", t, re.IGNORECASE)
    if gpa_match and not extracted.education.gpa_percentage:
        extracted.education.gpa_percentage = float(gpa_match.group(1))

    # ── Budget ────────────────────────────────────────────
    budget_match = re.search(r"(\d+)\s*(?:lakh|lakhs|lac)", t, re.IGNORECASE)
    if budget_match and not extracted.financial.budget_range:
        extracted.financial.budget_range = f"{budget_match.group(1)} Lakh INR"
        # Budget was explicitly mentioned — mark as disclosed
        extracted.financial.budget_status = BudgetStatus.DISCLOSED

    # ── Scholarship interest ──────────────────────────────
    if re.search(r"scholarship|funding|financial\s*aid|स्कॉलरशिप|शिष्यवृत्ती", t, re.IGNORECASE):
        extracted.financial.scholarship_interest = True

    # ── Course interest ───────────────────────────────────
    course_match = re.search(
        r"\b(MSc|MBA|MCA|MTech|MA|MEng|MPhil)\s+([\w\s]+?)(?:\.|,|\?|$)",
        transcript,
        re.IGNORECASE,
    )
    if course_match and not extracted.preferences.course_interest:
        extracted.preferences.course_interest = f"{course_match.group(1)} {course_match.group(2).strip()}"

    # ── Intake timing / timeline ──────────────────────────
    intake_match = re.search(r"\b(september|sept|sep)\s*(2025|2026|2027)\b", t, re.IGNORECASE)
    if not intake_match:
        intake_match = re.search(r"\b(january|jan)\s*(2026|2027)\b", t, re.IGNORECASE)
    if intake_match and not extracted.preferences.intake_timing:
        extracted.preferences.intake_timing = intake_match.group(0)
        extracted.timeline.planned_start = intake_match.group(0)

    # ── Unresolved objections ─────────────────────────────
    objections: List[str] = []
    for pattern, label in _OBJECTION_PATTERNS:
        if re.search(pattern, t, re.IGNORECASE):
            objections.append(label)

    # ── Emotional state ───────────────────────────────────
    anxiety = EmotionLevel.LOW
    if any(kw in t for kw in _ANXIETY_HIGH):
        anxiety = EmotionLevel.HIGH
    elif not any(kw in t for kw in _ANXIETY_LOW):
        anxiety = EmotionLevel.MEDIUM   # default when no strong signal

    urgency = EmotionLevel.LOW
    if any(kw in t for kw in _URGENCY_HIGH):
        urgency = EmotionLevel.HIGH
    elif not any(kw in t for kw in _URGENCY_LOW):
        urgency = EmotionLevel.MEDIUM

    confidence = EmotionLevel.MEDIUM
    if any(kw in t for kw in _CONFIDENCE_LOW):
        confidence = EmotionLevel.LOW
    elif any(kw in t for kw in _ANXIETY_LOW):  # re-use "confident/ready" keywords
        confidence = EmotionLevel.HIGH

    emotional = EmotionalState(
        anxiety=anxiety,
        confidence=confidence,
        urgency=urgency,
    )

    # ── Data completeness (count-based, 12 fields) ────────
    completeness_count = sum(
        1 for fn in _COMPLETENESS_FIELDS
        if (v := fn(extracted)) not in (None, "", [], False)
    )

    return extracted, objections, emotional, completeness_count
