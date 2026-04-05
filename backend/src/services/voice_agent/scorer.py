from __future__ import annotations

import re
from typing import Any, Dict


def score_lead(caller_doc: Dict[str, Any]) -> Dict[str, Any]:
    intent = 0
    financial = 0
    timeline = 0

    if caller_doc.get("course_interest"):
        intent += 10
    if caller_doc.get("target_countries"):
        intent += 10
    if caller_doc.get("education_level"):
        intent += 5
    if caller_doc.get("field"):
        intent += 5
    if caller_doc.get("gpa"):
        intent += 5

    score = caller_doc.get("test_score")
    test_type = caller_doc.get("test_type")
    if score and test_type == "IELTS" and score >= 6.0:
        intent += 5
    elif score and test_type == "PTE" and score >= 50:
        intent += 5

    budget = caller_doc.get("budget_range", "") or ""
    if budget:
        financial += 10
        budget_match = re.search(r"(\d+)", budget)
        if budget_match and int(budget_match.group(1)) >= 15:
            financial += 10
    if caller_doc.get("scholarship_interest"):
        financial += 5
    if caller_doc.get("budget_status") == "disclosed":
        financial += 5

    intake = caller_doc.get("intake_timing", "") or ""
    if intake:
        timeline += 10
        if "2025" in intake:
            timeline += 15
        elif "jan" in intake.lower() or "january 2026" in intake.lower():
            timeline += 10
    if caller_doc.get("callback_requested"):
        timeline += 5

    total = min(100, intent + financial + timeline)
    classification = "Hot" if total >= 65 else "Warm" if total >= 35 else "Cold"

    return {
        "lead_score": total,
        "classification": classification,
    }
