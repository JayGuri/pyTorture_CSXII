"""
Lead Scoring and Data Completeness Service

Calculates lead scores and data completeness percentage based on profile information.
Tracks which fields are populated and provides recommendations for improvement.
"""

import logging
from typing import Dict, Any, List, Tuple
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Fields required for full data completeness (MongoDB schema)
REQUIRED_FIELDS = [
    "name",
    "email",
    "phone",
    "education_level",
    "location",
    "field",
    "institution",
    "gpa",
    "target_countries",
    "course_interest",
    "intake_timing",
    "test_score",
    "budget_range",
    "scholarship_interest",
]

# Fields that increase score significantly
HIGH_IMPACT_FIELDS = {
    "test_score": 15,
    "gpa": 12,
    "con_session_req": 10,
    "target_countries": 10,
    "budget_range": 8,
}

# Fields that increase score moderately
MEDIUM_IMPACT_FIELDS = {
    "email": 8,
    "education_level": 7,
    "field": 7,
    "institution": 6,
    "course_interest": 6,
}

# Fields that increase score slightly
LOW_IMPACT_FIELDS = {
    "location": 4,
    "intake_timing": 4,
    "scholarship_interest": 3,
}


class LeadScoringService:
    """Service for calculating lead scores and data completeness."""

    @staticmethod
    def calculate_data_completeness(lead_profile: Dict[str, Any]) -> int:
        """
        Calculate data completeness percentage for a lead profile.

        Completeness is based on:
        - Required fields populated (60% weight)
        - Optional fields populated (40% weight)
        - Field quality/validity

        Args:
            lead_profile: Lead data from Supabase

        Returns:
            Percentage score 0-100
        """
        if not lead_profile:
            return 0

        # Required fields check (60% of score)
        required_count = 0
        for field in REQUIRED_FIELDS:
            value = lead_profile.get(field)
            if value and value != "" and value != [] and value != 0:
                required_count += 1

        required_percentage = (required_count / len(REQUIRED_FIELDS)) * 60
        logger.debug(f"Required fields: {required_count}/{len(REQUIRED_FIELDS)} = {required_percentage:.1f}%")

        # Optional fields check (40% of score)
        optional_fields = [f for f in lead_profile.keys() if f not in REQUIRED_FIELDS]
        optional_weight = 40
        optional_points = 0

        for field in optional_fields:
            value = lead_profile.get(field)
            if value and value != "" and value != [] and value != 0:
                if field in HIGH_IMPACT_FIELDS:
                    optional_points += HIGH_IMPACT_FIELDS[field]
                elif field in MEDIUM_IMPACT_FIELDS:
                    optional_points += MEDIUM_IMPACT_FIELDS[field]
                elif field in LOW_IMPACT_FIELDS:
                    optional_points += LOW_IMPACT_FIELDS[field]

        # Cap optional points at 40
        optional_percentage = min(optional_points, optional_weight)
        logger.debug(f"Optional fields: {optional_points} points capped at {optional_percentage}%")

        total_completeness = int(required_percentage + optional_percentage)
        return min(100, max(0, total_completeness))

    @staticmethod
    def get_missing_fields(lead_profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Get list of missing or incomplete fields for a lead.

        Args:
            lead_profile: Lead data from Supabase

        Returns:
            List of missing field details
        """
        missing = []

        # Check required fields
        for field in REQUIRED_FIELDS:
            value = lead_profile.get(field)
            if not value or value == "" or value == [] or value == 0:
                missing.append({
                    "field": field,
                    "impact": "high",
                    "priority": "critical",
                    "description": f"{field.replace('_', ' ').title()} is required for recommendations",
                })

        return missing

    @staticmethod
    def get_improvement_recommendations(
        lead_profile: Dict[str, Any],
        missing_fields: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Get actionable recommendations to improve lead profile completeness.

        Args:
            lead_profile: Lead data from Supabase
            missing_fields: List of missing fields

        Returns:
            List of improvement recommendations
        """
        recommendations = []

        if not lead_profile.get("test_score"):
            recommendations.append({
                "priority": "high",
                "title": "Schedule Language Test",
                "description": "IELTS or PTE score is required for UK/Ireland/UAE universities",
                "action": "Book exam and add score",
            })

        if not lead_profile.get("gpa"):
            recommendations.append({
                "priority": "high",
                "title": "Add Your GPA",
                "description": "GPA helps match universities that fit your academic level",
                "action": "Request official transcript",
            })

        if not lead_profile.get("target_countries"):
            recommendations.append({
                "priority": "high",
                "title": "Choose Target Countries",
                "description": "Narrow down which countries you want to study in",
                "action": "Select from UK, Ireland, UAE",
            })

        if not lead_profile.get("budget_range"):
            recommendations.append({
                "priority": "medium",
                "title": "Specify Your Budget",
                "description": "Budget impacts scholarship eligibility",
                "action": "Choose low/medium/high budget range",
            })

        if not lead_profile.get("con_session_req"):
            recommendations.append({
                "priority": "medium",
                "title": "Update Application Status",
                "description": "Help us understand where you are in the process",
                "action": "Select: Not started, In progress, Applied, Admitted, etc.",
            })

        return recommendations

    @staticmethod
    def calculate_lead_score(lead_profile: Dict[str, Any]) -> int:
        """
        Calculate overall lead score (0-100) based on profile quality and engagement.

        Scoring:
        - Data completeness: 50 points
        - Engagement signals: 30 points
        - Application progress: 20 points

        Args:
            lead_profile: Lead data from Supabase

        Returns:
            Lead score 0-100
        """
        score = 0

        # Data completeness (50 points)
        completeness = LeadScoringService.calculate_data_completeness(lead_profile)
        score += (completeness / 100) * 50

        # Engagement signals (30 points)
        engagement = 0
        if lead_profile.get("test_score") or lead_profile.get("test_score"):
            engagement += 10  # Has test score
        if lead_profile.get("con_session_req") in ["submitted", "admitted", "accepted"]:
            engagement += 12  # Active in application process
        if lead_profile.get("scholarship_interest"):
            engagement += 8   # Interested in scholarships
        score += min(engagement, 30)

        # Application progress (20 points)
        stage = (lead_profile.get("con_session_req") or "").lower()
        if stage == "accepted" or stage == "admitted":
            score += 20
        elif stage in ["submitted", "shortlisted"]:
            score += 15
        elif stage == "in_progress":
            score += 10
        elif stage == "not_started":
            score += 0

        return int(min(100, max(0, score)))

    @staticmethod
    def calculate_intent_score(lead_profile: Dict[str, Any]) -> int:
        """
        Calculate intent score (0-100) - how serious the lead is about studying abroad.

        Factors:
        - Has concrete timeline (20 points)
        - Has specific targets (20 points)
        - Has financial plans (20 points)
        - Has test scores (20 points)
        - Has completed profile (20 points)

        Args:
            lead_profile: Lead data from Supabase

        Returns:
            Intent score 0-100
        """
        score = 0

        # Timeline (20 points)
        timeline = (lead_profile.get("intake_timing") or "").lower()
        if "urgent" in timeline or "asap" in timeline:
            score += 20
        elif "soon" in timeline or "next" in timeline:
            score += 15
        elif "later" in timeline:
            score += 5

        # Specific targets (20 points)
        if lead_profile.get("target_countries"):
            score += 12
        if lead_profile.get("course_interest"):
            score += 8

        # Financial plans (20 points)
        if lead_profile.get("budget_range"):
            score += 15
        if lead_profile.get("scholarship_interest"):
            score += 5

        # Test scores (20 points)
        if lead_profile.get("test_score") or lead_profile.get("test_score"):
            score += 20

        # Profile completeness (20 points)
        completeness = LeadScoringService.calculate_data_completeness(lead_profile)
        score += (completeness / 100) * 20

        return int(min(100, max(0, score)))

    @staticmethod
    def calculate_financial_score(lead_profile: Dict[str, Any]) -> int:
        """
        Calculate financial score (0-100) - likelihood of affording studies.

        Factors:
        - Budget range specified (30 points)
        - Scholarship interest (30 points)
        - GPA (for scholarship eligibility) (20 points)
        - Work experience (for scholarships) (20 points)

        Args:
            lead_profile: Lead data from Supabase

        Returns:
            Financial score 0-100
        """
        score = 0

        # Budget range (30 points)
        budget = (lead_profile.get("budget_range") or "").lower()
        if "high" in budget or "comfort" in budget:
            score += 30
        elif "medium" in budget or "realistic" in budget:
            score += 20
        elif "low" in budget:
            score += 10

        # Scholarship interest (30 points)
        if lead_profile.get("scholarship_interest"):
            score += 30

        # GPA (20 points) - determines scholarship eligibility
        gpa = lead_profile.get("gpa")
        if gpa is not None:
            if gpa >= 75:
                score += 20
            elif gpa >= 65:
                score += 12
            elif gpa >= 55:
                score += 5

        # Work experience (20 points)
        persona = (lead_profile.get("persona_type") or "").lower()
        if "work" in persona or "professional" in persona:
            score += 15
        if lead_profile.get("intake_timing") == "Can work after studies":
            score += 5

        return int(min(100, max(0, score)))

    @staticmethod
    def calculate_timeline_score(lead_profile: Dict[str, Any]) -> int:
        """
        Calculate timeline score (0-100) - urgency and readiness.

        Factors:
        - Timeline urgency (40 points)
        - Intake timing (30 points)
        - Application readiness (30 points)

        Args:
            lead_profile: Lead data from Supabase

        Returns:
            Timeline score 0-100
        """
        score = 0

        # Timeline urgency (40 points)
        timeline = (lead_profile.get("intake_timing") or "").lower()
        if "urgent" in timeline or "asap" in timeline:
            score += 40
        elif "soon" in timeline or "next" in timeline:
            score += 25
        elif "later" in timeline:
            score += 10

        # Intake timing (30 points)
        intake = (lead_profile.get("intake_timing") or "").lower()
        if "next" in intake or intake in ["2024", "2025", "september"]:
            score += 30
        elif "current" in intake or intake in ["2026"]:
            score += 20
        elif "flexible" in intake:
            score += 10

        # Application readiness (30 points)
        stage = (lead_profile.get("con_session_req") or "").lower()
        if stage in ["submitted", "shortlisted", "admitted", "accepted"]:
            score += 30
        elif stage == "in_progress":
            score += 15
        elif stage == "not_started":
            score += 0

        return int(min(100, max(0, score)))
