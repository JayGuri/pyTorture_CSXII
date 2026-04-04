from __future__ import annotations

from typing import List

from src.models.types import (
    BudgetStatus,
    LeadClassification,
    LeadSnapshot,
    PersonaType,
    TestStage,
)


def generate_recommended_actions(snapshot: LeadSnapshot) -> List[str]:
    """Produce up to 5 recommended next-actions from a LeadSnapshot."""
    actions: List[str] = []
    score = snapshot.lead_score
    data = snapshot.extracted_data

    if score.classification == LeadClassification.HOT:
        actions.append("Schedule priority callback within 24 hours")

    if not data.test_status.score and data.test_status.stage == TestStage.NOT_STARTED:
        actions.append("Send IELTS coaching brochure via WhatsApp")

    if data.test_status.stage == TestStage.PREPARING:
        actions.append("Offer free IELTS mock test session")

    if data.financial.scholarship_interest:
        actions.append("Email Chevening/GREAT scholarship deadline calendar")

    if score.financial_readiness < 20 and data.financial.budget_status == BudgetStatus.NOT_ASKED:
        actions.append("Probe budget on callback — not discussed")

    if "Visa concern" in str(snapshot.unresolved_objections):
        actions.append("Share UK visa approval rate statistics for Indian students")

    if "Family approval" in str(snapshot.unresolved_objections):
        actions.append("Send parent-friendly info pack in Hindi/Marathi")

    if score.timeline_urgency >= 20 and not data.preferences.intake_timing:
        actions.append("Confirm September vs January intake preference urgently")

    if data.preferences.target_countries == ["UK"] and not data.preferences.course_interest:
        actions.append("Share top-5 courses for their profile")

    if snapshot.persona == PersonaType.PROXY_CALLER:
        actions.append("Schedule parent counselling session — decision maker on call")

    return actions[:5]  # cap at 5 most relevant
