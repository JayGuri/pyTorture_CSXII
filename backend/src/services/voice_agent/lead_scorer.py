from __future__ import annotations

import re

from src.models.types import ExtractedData, LeadClassification, LeadScore


def calculate_lead_score(data: ExtractedData) -> LeadScore:
    """Score a lead from its extracted data.

    Returns a LeadScore with total, intent_seriousness, financial_readiness,
    timeline_urgency, and classification.
    """
    intent_score = 0
    financial_score = 0
    timeline_score = 0

    # ── Intent Score (0-40) ───────────────────────────────
    if data.preferences.course_interest:
        intent_score += 10
    if data.preferences.target_countries and len(data.preferences.target_countries) > 0:
        intent_score += 10
    if data.education.level:
        intent_score += 5
    if data.education.field:
        intent_score += 5

    # IELTS score ≥ 6.0
    if (
        data.test_status.score is not None
        and data.test_status.exam_type == "IELTS"
        and data.test_status.score >= 6.0
    ):
        intent_score += 5

    # PTE score ≥ 50
    if (
        data.test_status.score is not None
        and data.test_status.exam_type == "PTE"
        and data.test_status.score >= 50
    ):
        intent_score += 5

    # ── Financial Score (0-30) ────────────────────────────
    budget = data.financial.budget_range
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
    if data.financial.scholarship_interest:
        financial_score += 5

    # ── Timeline Score (0-30) ─────────────────────────────
    timing = data.preferences.intake_timing
    if timing:
        timeline_score += 10
        if re.search(r"2025|sept.*2025", timing, re.IGNORECASE):
            timeline_score += 20
        elif re.search(r"jan.*2026", timing, re.IGNORECASE):
            timeline_score += 15
        elif re.search(r"sept.*2026", timing, re.IGNORECASE):
            timeline_score += 10
    if data.timeline.application_stage:
        timeline_score += 5

    # ── Total & classification ────────────────────────────
    total_score = min(100, intent_score + financial_score + timeline_score)

    if total_score >= 65:
        classification = LeadClassification.HOT
    elif total_score >= 35:
        classification = LeadClassification.WARM
    else:
        classification = LeadClassification.COLD

    return LeadScore(
        total=total_score,
        intent_seriousness=intent_score,
        financial_readiness=financial_score,
        timeline_urgency=timeline_score,
        classification=classification,
    )
