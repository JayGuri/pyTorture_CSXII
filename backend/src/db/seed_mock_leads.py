"""
Mock Data Seeder for Supabase

Populates the leads table with realistic test data for testing the For You service.
Run this to quickly fill the database with various student profiles.

Usage:
    python -m src.db.seed_mock_leads

Or from Python:
    from src.db.seed_mock_leads import seed_mock_leads
    seed_mock_leads()
"""

from datetime import datetime, timezone
import uuid
from typing import List, Dict, Any
from src.db.supabase_client import supabase
import logging

logger = logging.getLogger(__name__)


def generate_session_id() -> str:
    """Generate a unique session ID (UUID format)."""
    return str(uuid.uuid4())


def generate_unique_email(base_email: str) -> str:
    """Generate unique email with timestamp suffix."""
    timestamp = datetime.now(timezone.utc).strftime("%s")
    parts = base_email.split("@")
    return f"{parts[0]}.{timestamp}@{parts[1]}"


def create_mock_leads() -> List[Dict[str, Any]]:
    """Create realistic mock lead data for testing."""

    leads = [
        # HOT LEADS - Highly likely to convert
        {
            "session_id": generate_session_id(),
            "name": "Aanya Sharma",
            "phone": "+91-9876543210",
            "email": generate_unique_email("aanya.sharma@example.com"),
            "location": "Mumbai, India",
            "education_level": "Masters",
            "field": "Computer Science",
            "institution": "Indian Institute of Technology Delhi",
            "gpa": 7.8,
            "target_countries": ["UK", "Ireland"],
            "course_interest": "Machine Learning",
            "intake_timing": "Fall 2025",
            "ielts_score": 7.5,
            "pte_score": None,
            "budget_range": "Medium",
            "budget_status": "disclosed",
            "scholarship_interest": True,
            "timeline": "3-6 months",
            "application_stage": "Research",
            "persona_type": "Career Changer",
            "lead_score": 85,
            "intent_score": 90,
            "financial_score": 70,
            "timeline_score": 85,
            "classification": "Hot",
            "data_completeness": 95,
            "emotional_anxiety": "low",
            "emotional_confidence": "high",
            "emotional_urgency": "medium",
            "callback_requested": True,
            "competitor_mentioned": False,
            "ielts_upsell_flag": False,
            "counsellor_brief": "Strong profile, clear goals, committed to applying soon",
            "recommended_universities": ["Imperial College London", "UCL"],
            "unresolved_objections": [],
        },

        # HOT LEAD - Already working professional
        {
            "session_id": generate_session_id(),
            "name": "Vikram Singh",
            "phone": "+91-9123456789",
            "email": generate_unique_email("vikram.singh@techcorp.com"),
            "location": "Bangalore, India",
            "education_level": "Masters",
            "field": "Data Science",
            "institution": "Delhi University",
            "gpa": 6.8,
            "target_countries": ["UK"],
            "course_interest": "Data Science",
            "intake_timing": "Spring 2025",
            "ielts_score": 7.0,
            "pte_score": 79,
            "budget_range": "Low",
            "budget_status": "disclosed",
            "scholarship_interest": True,
            "timeline": "1-3 months",
            "application_stage": "Shortlisted",
            "persona_type": "Working Professional",
            "lead_score": 92,
            "intent_score": 95,
            "financial_score": 60,
            "timeline_score": 95,
            "classification": "Hot",
            "data_completeness": 98,
            "emotional_anxiety": "low",
            "emotional_confidence": "high",
            "emotional_urgency": "high",
            "callback_requested": False,
            "competitor_mentioned": True,
            "ielts_upsell_flag": False,
            "counsellor_brief": "5 years experience in tech, applying to 4 universities, needs scholarship",
            "recommended_universities": ["LSE", "Manchester University"],
            "unresolved_objections": [],
        },

        # WARM LEADS - Interested but need more info
        {
            "session_id": generate_session_id(),
            "name": "Priya Patel",
            "phone": "+91-9988776655",
            "email": generate_unique_email("priya.patel@gmail.com"),
            "location": "Gujarat, India",
            "education_level": "Undergraduate",
            "field": "Business Administration",
            "institution": "Gujarat Technological University",
            "gpa": 7.2,
            "target_countries": ["UK", "Ireland", "USA"],
            "course_interest": "MBA",
            "intake_timing": "Fall 2025",
            "ielts_score": None,
            "pte_score": None,
            "budget_range": "High",
            "budget_status": "not_asked",
            "scholarship_interest": False,
            "timeline": "6-12 months",
            "application_stage": "Research",
            "persona_type": "Recent Graduate",
            "lead_score": 65,
            "intent_score": 70,
            "financial_score": 80,
            "timeline_score": 60,
            "classification": "Warm",
            "data_completeness": 70,
            "emotional_anxiety": "medium",
            "emotional_confidence": "medium",
            "emotional_urgency": "low",
            "callback_requested": True,
            "competitor_mentioned": False,
            "ielts_upsell_flag": True,
            "counsellor_brief": "Needs IELTS coaching, interested in multiple countries",
            "recommended_universities": [],
            "unresolved_objections": ["Which MBA program is best?", "Visa timeline concerns"],
        },

        # WARM LEAD - Still gathering info
        {
            "session_id": generate_session_id(),
            "name": "Rahul Kumar",
            "phone": "+91-8765432109",
            "email": generate_unique_email("rahul.kumar@student.com"),
            "location": "Delhi, India",
            "education_level": "Masters",
            "field": "Finance",
            "institution": "Delhi School of Economics",
            "gpa": 6.5,
            "target_countries": ["UK"],
            "course_interest": "Finance",
            "intake_timing": "Fall 2025",
            "ielts_score": 6.5,
            "pte_score": None,
            "budget_range": "Medium",
            "budget_status": "deferred",
            "scholarship_interest": True,
            "timeline": "3-6 months",
            "application_stage": "Researching",
            "persona_type": "Recent Graduate",
            "lead_score": 60,
            "intent_score": 65,
            "financial_score": 65,
            "timeline_score": 70,
            "classification": "Warm",
            "data_completeness": 75,
            "emotional_anxiety": "medium",
            "emotional_confidence": "medium",
            "emotional_urgency": "medium",
            "callback_requested": True,
            "competitor_mentioned": False,
            "ielts_upsell_flag": True,
            "counsellor_brief": "Interested in London universities, waiting for exam results",
            "recommended_universities": [],
            "unresolved_objections": ["Need higher IELTS score", "Waiting for undergrad results"],
        },

        # COLD LEADS - Just exploring options
        {
            "session_id": generate_session_id(),
            "name": "Neha Gupta",
            "phone": "+91-7654321098",
            "email": generate_unique_email("neha.gupta@example.com"),
            "location": "Hyderabad, India",
            "education_level": "Undergraduate",
            "field": "Engineering",
            "institution": "BITS Pilani",
            "gpa": 6.0,
            "target_countries": ["UK", "Ireland"],
            "course_interest": None,
            "intake_timing": "Fall 2026",
            "ielts_score": None,
            "pte_score": None,
            "budget_range": None,
            "budget_status": "not_asked",
            "scholarship_interest": False,
            "timeline": "12+ months",
            "application_stage": "Early Research",
            "persona_type": "Current Student",
            "lead_score": 35,
            "intent_score": 40,
            "financial_score": None,
            "timeline_score": 30,
            "classification": "Cold",
            "data_completeness": 45,
            "emotional_anxiety": "high",
            "emotional_confidence": "low",
            "emotional_urgency": "low",
            "callback_requested": False,
            "competitor_mentioned": False,
            "ielts_upsell_flag": True,
            "counsellor_brief": "Very early stage, unsure about study abroad plans",
            "recommended_universities": [],
            "unresolved_objections": [
                "Uncertain about studying abroad",
                "Cost concerns not discussed",
                "No clear course preference",
            ],
        },

        # COLD LEAD - Exploring universities
        {
            "session_id": generate_session_id(),
            "name": "Arjun Verma",
            "phone": "+91-6543210987",
            "email": generate_unique_email("arjun.v@gmail.com"),
            "location": "Chennai, India",
            "education_level": "Undergraduate",
            "field": "Commerce",
            "institution": "Sri Venkateswara College",
            "gpa": 5.8,
            "target_countries": ["Ireland"],
            "course_interest": None,
            "intake_timing": None,
            "ielts_score": None,
            "pte_score": None,
            "budget_range": None,
            "budget_status": "not_asked",
            "scholarship_interest": False,
            "timeline": "6-12 months",
            "application_stage": "Browsing",
            "persona_type": "Current Student",
            "lead_score": 30,
            "intent_score": 35,
            "financial_score": None,
            "timeline_score": 45,
            "classification": "Cold",
            "data_completeness": 35,
            "emotional_anxiety": "high",
            "emotional_confidence": "low",
            "emotional_urgency": "low",
            "callback_requested": False,
            "competitor_mentioned": False,
            "ielts_upsell_flag": True,
            "counsellor_brief": "Just browsing, minimal engagement",
            "recommended_universities": [],
            "unresolved_objections": [
                "Needs to understand visa process",
                "Not sure about course selection",
                "Family approval required",
            ],
        },

        # HIGH POTENTIAL - Good profile but missing key docs
        {
            "session_id": generate_session_id(),
            "name": "Divya Nair",
            "phone": "+91-5432109876",
            "email": generate_unique_email("divya.nair@outlook.com"),
            "location": "Kochi, India",
            "education_level": "Masters",
            "field": "Architecture",
            "institution": "School of Planning and Architecture",
            "gpa": 7.4,
            "target_countries": ["UK"],
            "course_interest": "Sustainable Architecture",
            "intake_timing": "Fall 2025",
            "ielts_score": None,
            "pte_score": 82,
            "budget_range": "Medium",
            "budget_status": "disclosed",
            "scholarship_interest": True,
            "timeline": "3-6 months",
            "application_stage": "Preparing",
            "persona_type": "Recent Graduate",
            "lead_score": 78,
            "intent_score": 80,
            "financial_score": 75,
            "timeline_score": 80,
            "classification": "Warm",
            "data_completeness": 80,
            "emotional_anxiety": "low",
            "emotional_confidence": "high",
            "emotional_urgency": "medium",
            "callback_requested": True,
            "competitor_mentioned": False,
            "ielts_upsell_flag": False,
            "counsellor_brief": "Strong PTE score, needs to prepare portfolio",
            "recommended_universities": ["UCL", "University of Edinburgh"],
            "unresolved_objections": ["Portfolio preparation timeline"],
        },

        # VERY HOT - Ready to apply
        {
            "session_id": generate_session_id(),
            "name": "Rohan Desai",
            "phone": "+91-4321098765",
            "email": generate_unique_email("rohan.desai@work.com"),
            "location": "Pune, India",
            "education_level": "Masters",
            "field": "Computer Science",
            "institution": "Pune Institute of Computer Technology",
            "gpa": 8.1,
            "target_countries": ["UK"],
            "course_interest": "Artificial Intelligence",
            "intake_timing": "Fall 2025",
            "ielts_score": 8.0,
            "pte_score": 88,
            "budget_range": "Medium",
            "budget_status": "disclosed",
            "scholarship_interest": True,
            "timeline": "1-3 months",
            "application_stage": "Submitted",
            "persona_type": "Working Professional",
            "lead_score": 96,
            "intent_score": 98,
            "financial_score": 75,
            "timeline_score": 98,
            "classification": "Hot",
            "data_completeness": 100,
            "emotional_anxiety": "low",
            "emotional_confidence": "very_high",
            "emotional_urgency": "high",
            "callback_requested": False,
            "competitor_mentioned": False,
            "ielts_upsell_flag": False,
            "counsellor_brief": "Already applied to 3 universities, waiting for responses",
            "recommended_universities": ["Imperial College London", "Cambridge"],
            "unresolved_objections": [],
        },
    ]

    return leads


def seed_mock_leads() -> None:
    """Upload mock leads to Supabase."""
    logger.info("🌱 Starting mock data seeding...")

    leads = create_mock_leads()
    logger.info(f"📝 Created {len(leads)} mock leads")

    success_count = 0
    error_count = 0

    for idx, lead in enumerate(leads, 1):
        try:
            # Add timestamps
            now = datetime.now(timezone.utc).isoformat()
            lead["created_at"] = now
            lead["updated_at"] = now

            # Remove session_id before insert (it's Twilio-generated, not user-provided)
            session_id_for_logging = lead.pop("session_id", None)

            # Insert into Supabase
            result = supabase.table("leads").insert(lead).execute()

            logger.info(f"✅ [{idx}/{len(leads)}] Inserted: {lead['name']} ({lead.get('classification', 'Unknown')}) [ID: {result.data[0]['id']}]")
            success_count += 1

        except Exception as e:
            logger.error(f"❌ [{idx}/{len(leads)}] Failed to insert {lead['name']}: {e}")
            error_count += 1

    logger.info(f"\n{'='*60}")
    logger.info(f"✅ SUCCESS: {success_count}/{len(leads)} leads inserted")
    if error_count > 0:
        logger.warning(f"⚠️  FAILED: {error_count} leads had errors")
    logger.info(f"{'='*60}")

    # Print test data
    logger.info("\n📊 Test Data Summary:")
    logger.info(f"  🔴 HOT leads: 3")
    logger.info(f"  🟡 WARM leads: 3")
    logger.info(f"  🔵 COLD leads: 2")
    logger.info(f"\n📧 Test Emails (use in /for-you/profile endpoint):")
    for lead in leads[:3]:
        logger.info(f"  - {lead['email']} ({lead['name']})")

    logger.info(f"\n🧪 Test with:")
    logger.info(f"  curl 'http://localhost:8000/api/v1/for-you/profile' \\")
    logger.info(f"    -X POST -H 'Content-Type: application/json' \\")
    logger.info(f"    -d '{{\"email\": \"{leads[0]['email']}\"}}'")


def clear_mock_leads() -> None:
    """Delete all mock leads (use with caution!)."""
    try:
        logger.warning("⚠️  DELETING ALL LEADS FROM DATABASE!")

        # Get all session IDs that match our mock pattern
        result = supabase.table("leads").select("id").execute()

        if result.data:
            # Delete each lead
            for lead in result.data:
                supabase.table("leads").delete().eq("id", lead["id"]).execute()

            logger.info(f"✅ Deleted {len(result.data)} leads")
        else:
            logger.info("ℹ️  No leads to delete")

    except Exception as e:
        logger.error(f"❌ Error deleting leads: {e}")


def main():
    """Main entry point."""
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == "--clear":
            confirmation = input("⚠️  This will DELETE ALL leads. Type 'yes' to confirm: ")
            if confirmation.lower() == "yes":
                clear_mock_leads()
            else:
                logger.info("❌ Cancelled")
            return

    seed_mock_leads()


if __name__ == "__main__":
    import logging.config

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s: %(message)s",
    )

    main()
