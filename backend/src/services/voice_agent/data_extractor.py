from __future__ import annotations

import re
from typing import Any, Dict, List

from src.models.types import Language


def extract_lead_data_from_text(
    transcript: str,
    existing: Dict[str, Any],
) -> Dict[str, Any]:
    updated = {**existing}
    t = transcript.lower()

    # Name extraction
    name_match = re.search(
        r"(?:my name is|i am|i'm|mera naam|naam)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
        transcript,
        re.IGNORECASE,
    )
    if name_match and not updated.get("name"):
        updated["name"] = name_match.group(1).strip()

    # Email extraction
    email_match = re.search(r"[\w.-]+@[\w.-]+\.\w+", transcript)
    if email_match and not updated.get("email"):
        updated["email"] = email_match.group(0)

    # Location extraction
    cities = [
        "mumbai", "pune", "delhi", "bangalore", "hyderabad", "chennai",
        "kolkata", "ahmedabad", "jaipur", "nagpur", "nashik", "thane",
        "navi mumbai", "aurangabad",
    ]
    for city in cities:
        if city in t and not updated.get("location"):
            updated["location"] = city.capitalize()
            break

    # Education level
    if re.search(r"\b(btech|b\.?tech|bachelor|bsc|b\.?sc|bcom|b\.?com|ba|bba|be|b\.?e)\b", t, re.IGNORECASE) and not updated.get("education_level"):
        updated["education_level"] = "Undergraduate"
    elif re.search(r"\b(mtech|m\.?tech|master|msc|m\.?sc|mcom|m\.?com|ma|mba|me|m\.?e|pg|post\s?grad)\b", t, re.IGNORECASE) and not updated.get("education_level"):
        updated["education_level"] = "Postgraduate"

    # Field of study
    fields: Dict[str, List[str]] = {
        "Computer Science": ["computer", "cs", "software", "coding", "programming", "it", "tech"],
        "Data Science": ["data science", "data analytics", "machine learning", "ml", "ai", "artificial intelligence"],
        "Business": ["business", "management", "mba", "finance", "marketing", "hr"],
        "Engineering": ["engineering", "mechanical", "electrical", "civil", "electronics"],
        "Medicine": ["medicine", "medical", "mbbs", "healthcare", "nursing"],
    }
    for field, keywords in fields.items():
        if any(k in t for k in keywords) and not updated.get("field"):
            updated["field"] = field
            break

    # Target countries
    countries: List[str] = []
    if re.search(r"\b(uk|united kingdom|england|britain|london|manchester|edinburgh)\b", t, re.IGNORECASE):
        countries.append("UK")
    if re.search(r"\b(ireland|dublin|cork|galway)\b", t, re.IGNORECASE):
        countries.append("Ireland")
    if countries and (not updated.get("target_countries") or len(updated.get("target_countries", [])) == 0):
        updated["target_countries"] = countries

    # IELTS score
    ielts_match = re.search(r"ielts\s*(?:score\s*(?:is\s*)?)?(\d+(?:\.\d)?)", t, re.IGNORECASE)
    if ielts_match and not updated.get("ielts_score"):
        updated["ielts_score"] = float(ielts_match.group(1))

    # PTE score
    pte_match = re.search(r"pte\s*(?:score\s*(?:is\s*)?)?(\d{2,3})", t, re.IGNORECASE)
    if pte_match and not updated.get("pte_score"):
        updated["pte_score"] = float(pte_match.group(1))

    # GPA
    gpa_match = re.search(r"(?:gpa|cgpa)\s*(?:is\s*)?(\d+(?:\.\d+)?)", t, re.IGNORECASE)
    if gpa_match and not updated.get("gpa"):
        updated["gpa"] = float(gpa_match.group(1))

    # Budget
    budget_match = re.search(r"(\d+)\s*(?:lakh|lakhs|lac)", t, re.IGNORECASE)
    if budget_match and not updated.get("budget_range"):
        updated["budget_range"] = f"{budget_match.group(1)} Lakh INR"

    # Scholarship interest
    if re.search(r"scholarship|funding|financial\s*aid|स्कॉलरशिप|शिष्यवृत्ती", t, re.IGNORECASE):
        updated["scholarship_interest"] = True

    # Course interest
    course_match = re.search(r"\b(MSc|MBA|MCA|MTech|MA|MEng|MPhil)\s+([\w\s]+?)(?:\.|,|\?|$)", transcript, re.IGNORECASE)
    if course_match and not updated.get("course_interest"):
        updated["course_interest"] = f"{course_match.group(1)} {course_match.group(2).strip()}"

    # Timeline
    if re.search(r"\b(september|sept|sep)\s*(2025|2026|2027)\b", t, re.IGNORECASE):
        m = re.search(r"\b(september|sept|sep)\s*(2025|2026|2027)\b", t, re.IGNORECASE)
        if m:
            updated["intake_timing"] = m.group(0)
    elif re.search(r"\b(january|jan)\s*(2026|2027)\b", t, re.IGNORECASE):
        m = re.search(r"\b(january|jan)\s*(2026|2027)\b", t, re.IGNORECASE)
        if m:
            updated["intake_timing"] = m.group(0)

    # Calculate completeness
    data_points = [
        "name", "phone", "location", "education_level", "field",
        "target_countries", "course_interest", "ielts_score",
        "budget_range", "intake_timing", "gpa", "scholarship_interest",
    ]
    filled = 0
    for k in data_points:
        v = updated.get(k)
        if v is not None and v != "" and not (isinstance(v, list) and len(v) == 0):
            filled += 1
    updated["data_completeness"] = round((filled / len(data_points)) * 100)

    return updated
