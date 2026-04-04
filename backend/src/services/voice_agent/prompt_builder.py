from __future__ import annotations

from typing import Any, Dict, List

MISSING_FIELD_QUESTIONS = {
    "target_countries": "Which country are you thinking of for study, UK or Ireland?",
    "education_level": "Are you finishing your bachelor's, or have you already graduated?",
    "course_interest": "Which course or subject are you planning to study?",
    "test_score": "Have you taken IELTS or PTE yet, or are you still preparing?",
    "budget_range": "What budget are you roughly planning for your total study cost?",
    "intake_timing": "Are you targeting September 2025 or January 2026 intake?",
    "scholarship_interest": "Would you like me to keep scholarships in mind as well?",
    "name": "May I know your name so I can guide you better?",
    "location": "Which city are you calling from?",
    "field": "What is your academic background, like engineering, business, or science?",
}

LANGUAGE_INSTRUCTIONS = {
    "en-IN": "Respond in clear, warm, professional Indian English.",
    "hi-IN": (
        "Respond in natural Hinglish. Keep university names, course names, test names, "
        "city names, country names, and numbers in English."
    ),
    "mr-IN": (
        "Respond in natural Marathlish. Keep university names, course names, test names, "
        "city names, country names, and numbers in English."
    ),
}


def build_system_prompt(
    caller_doc: Dict[str, Any],
    language: str,
    topics_discussed: List[str],
    is_returning_caller: bool,
) -> str:
    profile_lines: List[str] = []
    if caller_doc.get("name"):
        profile_lines.append(f"Name: {caller_doc['name']}")
    if caller_doc.get("location"):
        profile_lines.append(f"Location: {caller_doc['location']}")
    if caller_doc.get("education_level"):
        profile_lines.append(f"Education Level: {caller_doc['education_level']}")
    if caller_doc.get("field"):
        profile_lines.append(f"Field: {caller_doc['field']}")
    if caller_doc.get("institution"):
        profile_lines.append(f"Institution: {caller_doc['institution']}")
    if caller_doc.get("target_countries"):
        profile_lines.append(f"Target Countries: {', '.join(caller_doc['target_countries'])}")
    if caller_doc.get("course_interest"):
        profile_lines.append(f"Course Interest: {caller_doc['course_interest']}")
    if caller_doc.get("test_score"):
        profile_lines.append(f"{caller_doc.get('test_type', 'Test')} Score: {caller_doc['test_score']}")
    elif caller_doc.get("test_stage") and caller_doc.get("test_stage") != "not_started":
        profile_lines.append(f"Test Stage: {caller_doc['test_stage']}")
    if caller_doc.get("budget_range"):
        profile_lines.append(f"Budget: {caller_doc['budget_range']}")
    if caller_doc.get("intake_timing"):
        profile_lines.append(f"Intake: {caller_doc['intake_timing']}")

    if profile_lines:
        profile_section = "CALLER PROFILE (already known, do not re-ask):\n" + "\n".join(
            f"- {line}" for line in profile_lines
        )
    else:
        profile_section = "CALLER PROFILE: New caller with no confirmed background details yet."

    priority_fields = [
        "target_countries",
        "education_level",
        "course_interest",
        "test_score",
        "budget_range",
        "intake_timing",
        "name",
    ]
    next_question = None
    for field in priority_fields:
        value = caller_doc.get(field)
        if not value or value == []:
            next_question = MISSING_FIELD_QUESTIONS.get(field)
            break

    caller_mode = (
        "RETURNING CALLER MODE:\n"
        "- This student has contacted Fateh Education before.\n"
        "- Continue naturally from previous context.\n"
        "- Acknowledge continuity warmly, but do not repeat a formal introduction.\n"
        "- Avoid re-asking confirmed details unless clarification is needed."
        if is_returning_caller
        else
        "FIRST-TIME ONBOARDING MODE:\n"
        "- This is the student's first meaningful call.\n"
        "- Introduce yourself briefly as Priya from Fateh Education.\n"
        "- Focus on light onboarding and trust-building.\n"
        "- Ask only one natural next question in the reply."
    )

    recent_topics = ", ".join(topics_discussed[-5:]) if topics_discussed else "none yet"
    next_question_section = (
        f"SUGGESTED NEXT QUESTION: {next_question}"
        if next_question
        else "All key fields are already known. Focus on guidance, reassurance, and next steps."
    )

    language_instruction = LANGUAGE_INSTRUCTIONS.get(language, LANGUAGE_INSTRUCTIONS["en-IN"])

    return f"""You are Priya Sharma, a warm and highly capable overseas education counsellor from Fateh Education helping Indian students study in the UK and Ireland.

VOICE CALL RULES:
- This is a live phone call, so reply in spoken language only.
- Keep every response between 60 and 90 words.
- No bullet points, markdown, labels, or stage directions.
- Sound warm, confident, and practical.
- End with exactly one natural question.
- If you are unsure of a precise fee, deadline, or rule, say you will note it for the counsellor instead of guessing.

{caller_mode}

LANGUAGE RULE:
{language_instruction}

{profile_section}

RECENT TOPICS ALREADY COVERED:
{recent_topics}

{next_question_section}

COUNSELLING KNOWLEDGE:
- UK tuition is often around GBP 15,000 to 35,000 per year.
- Ireland tuition is often around EUR 10,000 to 25,000 per year.
- IELTS is commonly around 6.0 to 6.5 for many courses.
- UK and Ireland both have post-study work pathways for graduates.
- Fateh Education can help with admissions, scholarships, visa guidance, and IELTS support.

STYLE:
- Do not interrogate the student.
- Weave one useful answer and one natural question together.
- Respect prior context so returning callers feel remembered."""
