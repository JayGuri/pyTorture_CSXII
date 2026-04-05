"""
For You Page Service

Provides personalized recommendations for students based on their call session data.
Integrates Supabase leads table with knowledge bases for intelligent filtering and matching.

Database Tables Used:
- call_sessions: Twilio call metadata
- leads: Detailed student profile from voice agent analysis
"""

from typing import Any, Dict, List, Optional
from src.db.mongo_client import get_db
from src.services.lead_scoring import LeadScoringService
import json
import logging

logger = logging.getLogger(__name__)


class ForYouService:
    """Service for fetching and personalizing For You page data."""

    @staticmethod
    async def get_lead_by_session_id(call_sid: str) -> Optional[Dict[str, Any]]:
        """
        Fetch caller data from MongoDB by call session ID.

        Args:
            call_sid: Twilio call session ID (matches calls.call_sid in callers collection)

        Returns:
            Caller record with all profile information, or None if not found
        """
        try:
            db = get_db()
            # Search in callers collection by call_sid within calls array
            caller = await db.callers.find_one({"calls.call_sid": call_sid})
            return caller if caller else None
        except Exception as e:
            logger.error(f"Error fetching caller by call_sid {call_sid}: {e}")
            return None

    @staticmethod
    async def get_lead_by_email(email: str) -> Optional[Dict[str, Any]]:
        """
        Fetch most recent caller data by email address.

        Args:
            email: User email

        Returns:
            Most recent caller record
        """
        try:
            db = get_db()
            # Find caller by email, sorted by last_contact descending
            caller = await db.callers.find_one({"email": email}, sort=[("last_contact", -1)])
            return caller if caller else None
        except Exception as e:
            logger.error(f"Error fetching caller by email {email}: {e}")
            return None

    @staticmethod
    def filter_universities_by_profile(
        lead_profile: Dict[str, Any],
        universities: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Filter universities based on lead profile criteria.

        Filtering logic:
        - Target countries: Match lead's target_countries
        - GPA requirement: Filter by lead's GPA (if provided)
        - Course interest: Match lead's course_interest with subject strengths
        - Acceptance tier: Adjust ranking based on lead's application_stage
        - IELTS requirement: Compare with lead's IELTS score

        Args:
            lead_profile: Lead data from Supabase
            universities: List of universities from KB

        Returns:
            Filtered and ranked list of universities
        """
        filtered = []

        target_countries = lead_profile.get("target_countries") or ["uk"]
        if isinstance(target_countries, str):
            target_countries = [target_countries.lower()]
        else:
            target_countries = [(c or "").lower() for c in target_countries]

        course_interest = (lead_profile.get("course_interest") or "").lower()
        gpa = lead_profile.get("gpa")
        # MongoDB uses test_score (with test_type: IELTS/PTE/TOEFL)
        test_score = lead_profile.get("test_score")
        test_type = lead_profile.get("test_type")

        for uni in universities:
            # Filter by country
            if (uni.get("country") or "").lower() not in target_countries:
                continue

            # Filter by GPA if available
            if gpa is not None:
                min_percentage = 70  # Default minimum
                courses = uni.get("courses", [])
                if courses and gpa < 65:  # If GPA < 65%, less likely to match
                    continue

            # Filter by course interest (match with subject strengths)
            subject_strengths = [(s or "").lower() for s in uni.get("subject_strengths", [])]
            if course_interest and not any(course_interest in s for s in subject_strengths):
                # Course not directly mentioned, but keep uni if it has strong general programs
                if not subject_strengths:
                    continue

            # Filter by English test requirement if score provided
            if test_score is not None:
                courses = uni.get("courses", [])
                required_ielts = max(
                    [float(c.get("ielts_min", 6.0)) for c in courses if c.get("ielts_min")],
                    default=6.0,
                )
                if test_score < required_ielts - 0.5:  # Allow 0.5 buffer
                    continue

            filtered.append(uni)

        # Rank by QS ranking (None values sort last)
        filtered.sort(key=lambda u: u.get("qs_rank_2026") or 999)
        return filtered

    @staticmethod
    def match_scholarships_by_profile(
        lead_profile: Dict[str, Any],
        scholarships: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Match scholarships based on lead profile eligibility.

        Matching logic:
        - Country match: Lead's target_countries vs scholarship's country
        - Study level: Match with lead's education_level (Masters/Undergraduate)
        - Work experience: Compare with lead's years of experience
        - Nationality: Match India (primary audience)
        - Funding interest: Prioritize if lead is scholarship_interest=true
        - Financial need: Prefer fully funded if lead's budget_range is low

        Args:
            lead_profile: Lead data from Supabase
            scholarships: List of scholarships from KB

        Returns:
            Matched and ranked scholarships
        """
        matched = []

        target_countries = lead_profile.get("target_countries") or ["uk"]
        if isinstance(target_countries, str):
            target_countries = [target_countries.lower()]
        else:
            target_countries = [(c or "").lower() for c in target_countries]

        education_level = (lead_profile.get("education_level") or "").lower()
        scholarship_interest = lead_profile.get("scholarship_interest", False)
        budget_range = (lead_profile.get("budget_range") or "").lower()

        # Estimate work experience (simplified - would come from call analysis)
        work_exp_years = 2 if "work" in str(lead_profile.get("persona_type", "")).lower() else 0

        for scholarship in scholarships:
            # Match country
            if (scholarship.get("country") or "").lower() not in target_countries:
                continue

            # Match study level
            levels = scholarship.get("level_of_study", [])
            if levels:
                matched_level = False
                if education_level in ["masters", "postgraduate"] and "Masters" in levels:
                    matched_level = True
                elif education_level in ["undergraduate", "bachelors"] and "Undergraduate" in levels:
                    matched_level = True
                if not matched_level:
                    continue

            # Check nationality eligibility (India is primary)
            eligible_nationalities = scholarship.get("eligible_nationalities", "")
            if isinstance(eligible_nationalities, str):
                if "India" not in eligible_nationalities:
                    continue
            elif isinstance(eligible_nationalities, list):
                if "India" not in eligible_nationalities:
                    continue

            # Check work experience requirements
            work_exp_requirement = scholarship.get("eligibility", {}).get("work_experience", "")
            if work_exp_requirement:
                digits = "".join(filter(str.isdigit, str(work_exp_requirement).split()[0] if work_exp_requirement.split() else ""))
                if digits:
                    try:
                        required_years = int(digits)
                        if work_exp_years < required_years:
                            continue
                    except ValueError:
                        pass

            # Calculate match score
            match_score = 0
            if scholarship.get("funding_level") == "full" and scholarship_interest:
                match_score += 50
            if scholarship.get("funding_level") == "full" and "low" in budget_range:
                match_score += 30
            if scholarship.get("india_specific", {}).get("india_eligible"):
                match_score += 20

            matched.append({
                **scholarship,
                "match_score": match_score,
                "source": scholarship.get("source") or ("india" if "India" in str(scholarship.get("eligible_nationalities", "")) or scholarship.get("india_specific") else "university")
            })

        # Sort by match score (higher is better)
        matched.sort(key=lambda s: s.get("match_score", 0), reverse=True)
        return matched

    @staticmethod
    def get_cost_recommendations(
        lead_profile: Dict[str, Any],
        cost_data: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """
        Get cost of living recommendations based on lead profile.

        Logic:
        - Target countries: Filter by lead's target_countries
        - Budget range: Recommend appropriate tier (min/realistic/comfortable)
        - Cities: Prioritize based on university preferences

        Args:
            lead_profile: Lead data from Supabase
            cost_data: Cost of living data from KB

        Returns:
            Recommended cities with cost breakdowns
        """
        recommendations = []

        target_countries = lead_profile.get("target_countries") or ["uk"]
        if isinstance(target_countries, str):
            target_countries = [target_countries.lower()]
        else:
            target_countries = [(c or "").lower() for c in target_countries]

        budget_range = (lead_profile.get("budget_range") or "").lower()

        # Determine preferred tier
        if "low" in budget_range or "budget" in budget_range:
            preferred_tier = "min"
        elif "high" in budget_range or "comfort" in budget_range:
            preferred_tier = "comfortable"
        else:
            preferred_tier = "realistic"

        for country in target_countries:
            country_data = cost_data.get(country.lower(), {})
            for city, city_costs in country_data.items():
                if city == "metadata":
                    continue

                monthly_costs = city_costs.get("monthly", {})
                if not monthly_costs:
                    continue

                recommendations.append({
                    "city": city.capitalize(),
                    "country": country.upper(),
                    "currency": city_costs.get("currency", "GBP"),
                    "monthly_cost": monthly_costs.get(preferred_tier),
                    "cost_range": {
                        "min": monthly_costs.get("min"),
                        "realistic": monthly_costs.get("realistic"),
                        "comfortable": monthly_costs.get("comfortable"),
                    },
                    "breakdown": city_costs.get("breakdown", {}),
                    "preferred_tier": preferred_tier,
                })

        return recommendations

    @staticmethod
    def get_personalized_insights(lead_profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate personalized insights and recommendations for the lead.

        Returns insights on:
        - Application timeline
        - Document requirements (IELTS/PTE)
        - Scholarship strategy
        - Budget planning
        - Visa timeline

        Args:
            lead_profile: Lead data from Supabase

        Returns:
            Dictionary of personalized insights
        """
        insights = {
            "application_readiness": "not_ready",
            "key_actions": [],
            "warnings": [],
            "opportunities": [],
        }

        # Application readiness assessment (MongoDB schema)
        con_session_req = (lead_profile.get("con_session_req") or "").lower()
        test_score = lead_profile.get("test_score")
        gpa = lead_profile.get("gpa")

        if con_session_req in ["approved", "in_process"]:
            insights["application_readiness"] = "ready"
        elif con_session_req in ["pending", "denied"]:
            insights["application_readiness"] = "in_progress"
        elif gpa and gpa >= 6.5 and test_score:
            insights["application_readiness"] = "almost_ready"

        # Key actions based on profile
        if not test_score:
            insights["key_actions"].append("Schedule IELTS/PTE exam")
            insights["warnings"].append("English proficiency test required for visa")

        if not gpa:
            insights["key_actions"].append("Prepare official transcripts")

        if lead_profile.get("scholarship_interest") and not gpa:
            insights["warnings"].append("Most scholarships require minimum GPA 65%")

        # Timeline insights (MongoDB: intake_timing)
        intake_timing = (lead_profile.get("intake_timing") or "").lower()

        if "urgent" in intake_timing or "asap" in intake_timing:
            insights["opportunities"].append("Fast-track scholarships available")
            insights["key_actions"].append("Apply within 2 weeks for best results")
        else:
            insights["opportunities"].append("Prepare well-researched applications for higher success")

        # Financial insights
        budget_range = (lead_profile.get("budget_range") or "").lower()
        if "low" in budget_range:
            insights["opportunities"].append("Prioritize fully-funded scholarships")
            insights["key_actions"].append("Explore part-time work eligibility")

        return insights

    @staticmethod
    def build_for_you_dashboard(
        lead_profile: Dict[str, Any],
        universities: List[Dict[str, Any]],
        scholarships: List[Dict[str, Any]],
        cost_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Build complete For You page dashboard with all personalized data.

        Args:
            lead_profile: Lead data from Supabase
            universities: All universities from KB
            scholarships: All scholarships from KB
            cost_data: Cost of living data from KB

        Returns:
            Complete dashboard dictionary for frontend
        """
        filtered_unis = ForYouService.filter_universities_by_profile(lead_profile, universities)
        matched_scholarships = ForYouService.match_scholarships_by_profile(
            lead_profile, scholarships
        )
        cost_recommendations = ForYouService.get_cost_recommendations(lead_profile, cost_data)
        insights = ForYouService.get_personalized_insights(lead_profile)

        # Enrich universities with financial data
        enriched_unis = []
        budget_range = (lead_profile.get("budget_range") or "").lower()
        
        # Determine preferred living cost tier
        if "low" in budget_range or "budget" in budget_range:
            cost_tier = "min"
        elif "high" in budget_range or "comfort" in budget_range:
            cost_tier = "comfortable"
        else:
            cost_tier = "realistic"

        course_interest = (lead_profile.get("course_interest") or "").lower()

        for uni in filtered_unis[:6]:
            # Clone to avoid modifying cache
            uni_copy = dict(uni)
            
            # 1. Resolve Currency
            country = (uni.get("country") or "UK").lower()
            currency = "GBP" if country == "uk" else ("EUR" if country == "ireland" else "USD")
            uni_copy["currency"] = currency

            # 2. Resolve Tuition (pick relevant course or first)
            courses = uni.get("courses", [])
            tuition = 0
            matched_course = None
            if courses:
                matched_course = next((c for c in courses if course_interest in c.get("name", "").lower()), courses[0])
                # Check for fee_gbp or fee_eur
                tuition = matched_course.get("fee_gbp") or matched_course.get("fee_eur") or matched_course.get("fee") or 25000
            
            uni_copy["tuitionYear"] = tuition
            uni_copy["courseTitle"] = matched_course.get("name") if matched_course else uni.get("notable_course")

            # 3. Resolve Living Costs (from city in cost_data)
            city = (uni.get("city") or "").lower()
            country_costs = cost_data.get(country, {})
            city_costs = country_costs.get(city, {})
            
            monthly = city_costs.get("monthly", {}).get(cost_tier, 1200)
            uni_copy["livingYear"] = monthly * 9  # 9 months academic year
            
            # 4. Other Fees (Visa, insurance, etc. - simplistic estimation)
            uni_copy["otherFeesYear"] = 1500 if country == "uk" else 1000
            
            enriched_unis.append(uni_copy)

        # Ensure scores are present (calculate on the fly if 0 or missing)
        completeness = lead_profile.get("data_completeness") or 0
        if completeness == 0:
            completeness = LeadScoringService.calculate_data_completeness(lead_profile)

        lead_score = lead_profile.get("lead_score") or 0
        if lead_score == 0:
            lead_score = LeadScoringService.calculate_lead_score(lead_profile)

        intent_score = lead_profile.get("intent_score") or 0
        if intent_score == 0:
            intent_score = LeadScoringService.calculate_intent_score(lead_profile)

        timeline_score = lead_profile.get("timeline_score") or 0
        if timeline_score == 0:
            timeline_score = LeadScoringService.calculate_timeline_score(lead_profile)

        financial_score = lead_profile.get("financial_score") or 0
        if financial_score == 0:
            financial_score = LeadScoringService.calculate_financial_score(lead_profile)

        classification = lead_profile.get("classification") or "Cold"
        if classification == "Cold":
            if lead_score > 80:
                classification = "Hot"
            elif lead_score > 50:
                classification = "Warm"

        # Add calculated scores to lead_profile for frontend response
        lead_profile["data_completeness"] = completeness
        lead_profile["lead_score"] = lead_score
        lead_profile["intent_score"] = intent_score
        lead_profile["financial_score"] = financial_score
        lead_profile["timeline_score"] = timeline_score
        lead_profile["classification"] = classification

        return {
            "lead_profile": lead_profile,
            "personalization": {
                "session_id": lead_profile.get("session_id"),
                "name": lead_profile.get("name"),
                "created_at": lead_profile.get("created_at"),
                "data_completeness": completeness,
                "classification": classification,
                "lead_score": lead_score,
                "intent_score": intent_score,
                "financial_score": financial_score,
                "timeline_score": timeline_score,
            },
            "recommendations": {
                "universities": enriched_unis,
                "scholarships": matched_scholarships[:20],
                "costs": cost_recommendations,
            },
            "insights": insights,
            "next_steps": [
                {
                    "title": "Complete Your Profile",
                    "description": "Answer a few more questions to unlock personalized recommendations",
                    "priority": "high" if completeness < 70 else "low",
                },
                {
                    "title": "Prepare for Exams",
                    "description": "IELTS/PTE required for visa and most universities",
                    "priority": "high" if not lead_profile.get("test_score") else "low",
                },
                {
                    "title": "Research Scholarships",
                    "description": "Apply for scholarships you're eligible for",
                    "priority": "high" if lead_profile.get("scholarship_interest") else "medium",
                },
                {
                    "title": "Plan Timeline",
                    "description": "Create application and visa timeline",
                    "priority": "medium",
                },
            ],
        }


# Convenience function for API routes
async def get_for_you_data(
    session_id: Optional[str] = None,
    email: Optional[str] = None,
    universities: Optional[List[Dict[str, Any]]] = None,
    scholarships: Optional[List[Dict[str, Any]]] = None,
    cost_data: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Main entry point to fetch and build For You page data.

    Args:
        session_id: Twilio session ID (preferred)
        email: User email (fallback)
        universities: Pre-loaded universities (from KB)
        scholarships: Pre-loaded scholarships (from KB)
        cost_data: Pre-loaded cost data (from KB)

    Returns:
        Complete For You dashboard or None if caller not found
    """
    # Fetch caller from database
    lead = None
    if session_id:
        lead = await ForYouService.get_lead_by_session_id(session_id)
    elif email:
        lead = await ForYouService.get_lead_by_email(email)

    if not lead:
        logger.warning(f"No caller found for session_id={session_id}, email={email}")
        return None

    # Build dashboard with provided KB data
    # In production, these would be loaded from the KB layer
    if universities and scholarships and cost_data:
        return ForYouService.build_for_you_dashboard(lead, universities, scholarships, cost_data)

    logger.error("KB data not provided to get_for_you_data")
    return None
