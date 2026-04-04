from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from src.utils.logger import logger


# ── Regex-based fast extraction (runs always, zero latency) ─────────────
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


# ── LLM-powered extraction (richer, runs after reply generation) ────────

_EXTRACTION_FIELDS = [
    "name", "email", "location", "education_level", "field", "institution",
    "gpa", "target_countries", "course_interest", "intake_timing",
    "test_type", "test_score", "test_stage", "budget_range", "budget_status",
    "scholarship_interest", "callback_requested", "competitor_mentioned",
    "next_con_session", "con_session_req",
]

_VALID_CON_SESSION_STATUSES = {"none", "approved", "denied", "in_process"}


def build_extraction_prompt(transcript: str, ai_reply: str, existing_doc: Dict[str, Any]) -> str:
    null_fields = [f for f in _EXTRACTION_FIELDS if not existing_doc.get(f) or existing_doc.get(f) == [] or existing_doc.get(f) == "not_started" or existing_doc.get(f) == "not_asked" or existing_doc.get(f) == "none"]

    if not null_fields:
        return ""

    return f"""You are a data extraction assistant for an overseas education counselling service.
Extract ONLY factual information that the student explicitly stated or confirmed in this conversation turn.

STUDENT SAID: "{transcript}"
COUNSELLOR REPLIED: "{ai_reply}"

FIELDS TO EXTRACT (only if the student clearly mentioned or confirmed them):
{json.dumps(null_fields)}

FIELD RULES:
- name: Student's full name. Title case.
- email: Valid email address.
- location: Indian city name. Title case.
- education_level: "Undergraduate" or "Postgraduate".
- field: One of: Computer Science, Data Science, Business, Engineering, Medicine, Law, Arts.
- institution: Name of college/university.
- gpa: Numeric GPA or percentage as a float.
- target_countries: Array of country names (e.g. ["UK", "Ireland"]).
- course_interest: Course name like "MSc Data Science".
- intake_timing: Format like "September 2025" or "January 2026".
- test_type: "IELTS", "PTE", or "TOEFL".
- test_score: Numeric score as float.
- test_stage: "not_started", "preparing", or "completed".
- budget_range: Budget string like "15 Lakh INR".
- budget_status: "disclosed" or "deferred".
- scholarship_interest: true or false.
- callback_requested: true if student asked for a callback.
- competitor_mentioned: true if student mentioned a competitor.
- next_con_session: If student mentions scheduling a counselling session, extract date/time in "ddmmyy/HH:MM" format. Use 24-hour time.
- con_session_req: "in_process" if student requested a session, "approved" if confirmed, "denied" if declined. Leave as "none" if not discussed.

Return ONLY a JSON object with the fields you extracted. Do NOT include fields where no clear info was given.
If nothing was extractable, return an empty object: {{}}
Return ONLY valid JSON, no explanation, no markdown.
"""


def parse_llm_extraction(raw: str) -> Dict[str, Any]:
    """Parse the raw LLM output into a clean dict of extracted fields."""
    text = raw.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON in the text
        json_match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
        if json_match:
            try:
                data = json.loads(json_match.group(0))
            except json.JSONDecodeError:
                return {}
        else:
            return {}

    if not isinstance(data, dict):
        return {}

    # Validate and clean extracted fields
    clean: Dict[str, Any] = {}

    if "name" in data and isinstance(data["name"], str) and data["name"].strip():
        clean["name"] = data["name"].strip().title()

    if "email" in data and isinstance(data["email"], str) and "@" in data["email"]:
        clean["email"] = data["email"].strip().lower()

    if "location" in data and isinstance(data["location"], str) and data["location"].strip():
        clean["location"] = data["location"].strip().title()

    if "education_level" in data and data["education_level"] in ("Undergraduate", "Postgraduate"):
        clean["education_level"] = data["education_level"]

    if "field" in data and data["field"] in ("Computer Science", "Data Science", "Business", "Engineering", "Medicine", "Law", "Arts"):
        clean["field"] = data["field"]

    if "institution" in data and isinstance(data["institution"], str) and data["institution"].strip():
        clean["institution"] = data["institution"].strip()

    if "gpa" in data:
        try:
            clean["gpa"] = float(data["gpa"])
        except (ValueError, TypeError):
            pass

    if "target_countries" in data and isinstance(data["target_countries"], list):
        clean["target_countries"] = [c for c in data["target_countries"] if isinstance(c, str)]

    if "course_interest" in data and isinstance(data["course_interest"], str) and data["course_interest"].strip():
        clean["course_interest"] = data["course_interest"].strip()

    if "intake_timing" in data and isinstance(data["intake_timing"], str) and data["intake_timing"].strip():
        clean["intake_timing"] = data["intake_timing"].strip()

    if "test_type" in data and data["test_type"] in ("IELTS", "PTE", "TOEFL"):
        clean["test_type"] = data["test_type"]

    if "test_score" in data:
        try:
            clean["test_score"] = float(data["test_score"])
            clean["test_stage"] = "completed"
        except (ValueError, TypeError):
            pass

    if "test_stage" in data and data["test_stage"] in ("not_started", "preparing", "completed"):
        clean["test_stage"] = data["test_stage"]

    if "budget_range" in data and isinstance(data["budget_range"], str) and data["budget_range"].strip():
        clean["budget_range"] = data["budget_range"].strip()
        clean["budget_status"] = "disclosed"

    if "budget_status" in data and data["budget_status"] in ("disclosed", "deferred"):
        clean["budget_status"] = data["budget_status"]

    if "scholarship_interest" in data and isinstance(data["scholarship_interest"], bool):
        clean["scholarship_interest"] = data["scholarship_interest"]

    if "callback_requested" in data and isinstance(data["callback_requested"], bool):
        clean["callback_requested"] = data["callback_requested"]

    if "competitor_mentioned" in data and isinstance(data["competitor_mentioned"], bool):
        clean["competitor_mentioned"] = data["competitor_mentioned"]

    if "next_con_session" in data and isinstance(data["next_con_session"], str) and data["next_con_session"].strip():
        clean["next_con_session"] = data["next_con_session"].strip()

    if "con_session_req" in data and data["con_session_req"] in _VALID_CON_SESSION_STATUSES:
        clean["con_session_req"] = data["con_session_req"]

    return clean


def merge_extractions(regex_updates: Dict[str, Any], llm_updates: Dict[str, Any]) -> Dict[str, Any]:
    """Merge regex and LLM extractions. LLM takes priority for richer fields."""
    merged = dict(regex_updates)
    for key, value in llm_updates.items():
        # LLM extraction overrides regex for these fields (LLM is smarter at parsing conversation)
        if key not in merged or key in ("name", "location", "field", "course_interest", "institution",
                                        "next_con_session", "con_session_req", "intake_timing"):
            merged[key] = value
    return merged
