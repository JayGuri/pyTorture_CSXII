from __future__ import annotations

import re
from typing import Any, Dict


def extract_updates(transcript: str, existing: Dict[str, Any]) -> Dict[str, Any]:
    text = transcript.strip()
    lower_text = text.lower()
    updates: Dict[str, Any] = {}

    if not existing.get("name"):
        name_match = re.search(
            r"(?:my name is|i am|i'm|mera naam|naam hai)\s+([A-Za-z][A-Za-z\s]{1,40})",
            text,
            re.IGNORECASE,
        )
        if name_match:
            candidate = " ".join(name_match.group(1).split()).strip(" .,!?")
            if candidate and len(candidate.split()) <= 3:
                updates["name"] = candidate.title()

    if not existing.get("email"):
        email_match = re.search(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", text)
        if email_match:
            updates["email"] = email_match.group(0)

    if not existing.get("location"):
        cities = [
            "mumbai", "pune", "delhi", "new delhi", "bangalore", "bengaluru",
            "hyderabad", "chennai", "kolkata", "ahmedabad", "jaipur", "nagpur",
            "nashik", "thane", "navi mumbai", "aurangabad", "surat", "lucknow",
            "kanpur", "indore", "noida", "gurgaon",
        ]
        for city in cities:
            if city in lower_text:
                updates["location"] = city.title()
                break

    if not existing.get("education_level"):
        if re.search(r"\b(btech|b\.?tech|bachelor|bsc|bcom|ba|bba|be|b\.?e|12th|hsc)\b", lower_text):
            updates["education_level"] = "Undergraduate"
        elif re.search(r"\b(mtech|m\.?tech|master|msc|mcom|ma|mba|me|m\.?e|pg|post ?grad|graduate)\b", lower_text):
            updates["education_level"] = "Postgraduate"

    if not existing.get("field"):
        fields = {
            "Computer Science": ["computer science", "software", "programming", "developer", "coding", "it"],
            "Data Science": ["data science", "data analytics", "machine learning", "artificial intelligence", "ai", "ml"],
            "Business": ["business", "management", "finance", "marketing", "hr", "mba"],
            "Engineering": ["engineering", "mechanical", "electrical", "civil", "electronics"],
            "Medicine": ["medicine", "medical", "mbbs", "nursing", "pharmacy", "healthcare"],
            "Law": ["law", "llb", "legal"],
            "Arts": ["arts", "humanities", "psychology", "sociology", "design"],
        }
        for field_name, keywords in fields.items():
            if any(keyword in lower_text for keyword in keywords):
                updates["field"] = field_name
                break

    if not existing.get("target_countries"):
        countries = []
        if re.search(r"\b(uk|united kingdom|england|britain|london|manchester|edinburgh|birmingham)\b", lower_text):
            countries.append("UK")
        if re.search(r"\b(ireland|dublin|cork|galway|limerick|ucd|tcd)\b", lower_text):
            countries.append("Ireland")
        if countries:
            updates["target_countries"] = countries

    if not existing.get("course_interest"):
        course_match = re.search(
            r"\b(MSc|MBA|MCA|MTech|MA|MEng|MPhil|BSc|BTech|BBA)\s+([A-Za-z][A-Za-z\s&-]{1,60})",
            text,
            re.IGNORECASE,
        )
        if course_match:
            updates["course_interest"] = f"{course_match.group(1).upper()} {' '.join(course_match.group(2).split())}".strip()

    if not existing.get("test_score"):
        ielts_match = re.search(r"ielts\s*(?:score\s*(?:is\s*)?)?(\d(?:\.\d)?)", lower_text)
        pte_match = re.search(r"pte\s*(?:score\s*(?:is\s*)?)?(\d{2,3})", lower_text)
        toefl_match = re.search(r"toefl\s*(?:score\s*(?:is\s*)?)?(\d{2,3})", lower_text)

        if ielts_match:
            updates["test_type"] = "IELTS"
            updates["test_score"] = float(ielts_match.group(1))
            updates["test_stage"] = "completed"
        elif pte_match:
            updates["test_type"] = "PTE"
            updates["test_score"] = float(pte_match.group(1))
            updates["test_stage"] = "completed"
        elif toefl_match:
            updates["test_type"] = "TOEFL"
            updates["test_score"] = float(toefl_match.group(1))
            updates["test_stage"] = "completed"
        elif re.search(r"\b(preparing|coaching|studying for|giving ielts|giving pte)\b", lower_text):
            updates["test_stage"] = "preparing"
        elif re.search(r"\b(not taken|haven't taken|have not taken|planning to|will give)\b", lower_text):
            updates["test_stage"] = "not_started"

    if not existing.get("budget_range"):
        budget_match = re.search(r"(\d+)\s*(?:lakh|lakhs|lac)", lower_text)
        if budget_match:
            updates["budget_range"] = f"{budget_match.group(1)} Lakh INR"
            updates["budget_status"] = "disclosed"
        elif re.search(r"\b(no budget|can't afford|cannot afford|tight budget|limited budget)\b", lower_text):
            updates["budget_status"] = "deferred"

    if not existing.get("intake_timing"):
        intake_match = re.search(r"\b(september|sept|sep|january|jan)\s*(2025|2026|2027)\b", lower_text)
        if intake_match:
            month = intake_match.group(1)
            year = intake_match.group(2)
            updates["intake_timing"] = f"{month.title()} {year}".replace("Sept", "September").replace("Sep", "September").replace("Jan", "January")

    if not existing.get("scholarship_interest"):
        if re.search(r"\b(scholarship|chevening|great scholarship|funding|financial aid)\b", lower_text):
            updates["scholarship_interest"] = True

    if not existing.get("gpa"):
        gpa_match = re.search(r"(?:gpa|cgpa)\s*(?:is\s*)?(\d+(?:\.\d+)?)", lower_text)
        percent_match = re.search(r"(\d{2,3}(?:\.\d+)?)\s*(?:percent|percentage|%)", lower_text)
        if gpa_match:
            updates["gpa"] = float(gpa_match.group(1))
        elif percent_match:
            updates["gpa"] = float(percent_match.group(1))

    if not existing.get("institution"):
        institution_match = re.search(
            r"(?:from|at|studying at|studied at)\s+([A-Z][A-Za-z\s&-]+(?:University|College|Institute|IIT|NIT|BITS))",
            text,
        )
        if institution_match:
            updates["institution"] = " ".join(institution_match.group(1).split())

    callback_patterns = ["call back", "callback", "ring me", "baad mein", "counsellor se baat"]
    competitor_names = ["ielts ninja", "leverage edu", "edvoy", "idp", "british council", "yocket"]

    if any(pattern in lower_text for pattern in callback_patterns):
        updates["callback_requested"] = True
    if any(name in lower_text for name in competitor_names):
        updates["competitor_mentioned"] = True

    effective_test_score = updates.get("test_score", existing.get("test_score"))
    effective_test_stage = updates.get("test_stage", existing.get("test_stage"))
    if (effective_test_score is not None and effective_test_score < 6.0) or effective_test_stage == "not_started":
        updates["ielts_upsell_flag"] = True

    return updates
