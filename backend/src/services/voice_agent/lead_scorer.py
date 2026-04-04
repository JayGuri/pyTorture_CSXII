from __future__ import annotations

import re
from typing import Any, Dict

from src.models.types import LeadClassification


class ScoreResult:
    def __init__(
        self,
        score: int,
        classification: LeadClassification,
        intent_score: int,
        financial_score: int,
        timeline_score: int,
    ):
        self.score = score
        self.classification = classification
        self.intent_score = intent_score
        self.financial_score = financial_score
        self.timeline_score = timeline_score


def calculate_lead_score(data: Dict[str, Any]) -> ScoreResult:
    intent_score = 0
    financial_score = 0
    timeline_score = 0

    # Intent Score (0-40)
    if data.get("course_interest"):
        intent_score += 10
    if data.get("target_countries") and len(data["target_countries"]) > 0:
        intent_score += 10
    if data.get("education_level"):
        intent_score += 5
    if data.get("field"):
        intent_score += 5
    ielts = data.get("ielts_score")
    if ielts is not None and ielts >= 6.0:
        intent_score += 5
    pte = data.get("pte_score")
    if pte is not None and pte >= 50:
        intent_score += 5

    # Financial Score (0-30)
    budget = data.get("budget_range")
    if budget:
        financial_score += 10
        m = re.search(r"(\d+)", budget)
        if m:
            lakhs = int(m.group(1))
            if lakhs >= 25:
                financial_score += 15
            elif lakhs >= 15:
                financial_score += 10
            else:
                financial_score += 5
    if data.get("scholarship_interest"):
        financial_score += 5

    # Timeline Score (0-30)
    timing = data.get("intake_timing")
    if timing:
        timeline_score += 10
        if re.search(r"2025|sept.*2025", timing, re.IGNORECASE):
            timeline_score += 20
        elif re.search(r"jan.*2026", timing, re.IGNORECASE):
            timeline_score += 15
        elif re.search(r"sept.*2026", timing, re.IGNORECASE):
            timeline_score += 10
    if data.get("application_stage"):
        timeline_score += 5

    total_score = min(100, intent_score + financial_score + timeline_score)

    classification: LeadClassification
    if total_score >= 65:
        classification = "Hot"
    elif total_score >= 35:
        classification = "Warm"
    else:
        classification = "Cold"

    return ScoreResult(
        score=total_score,
        classification=classification,
        intent_score=intent_score,
        financial_score=financial_score,
        timeline_score=timeline_score,
    )
