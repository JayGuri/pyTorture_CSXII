"""
For You Page API Routes

Endpoints to fetch personalized recommendations and dashboard data.
Requires user authentication (session_id or email).
"""

from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, EmailStr

from src.services.for_you_service import ForYouService, get_for_you_data
from src.services.kb_service import KBService
from src.services.lead_scoring import LeadScoringService
from src.db.mongo_client import get_db
from src.models.responses import DataResponse
from src.utils.logger import logger

router = APIRouter(prefix="/api/v1/for-you", tags=["for-you"])


# ─── Request/Response Models ───────────────────────────────────────────


class ForYouRequest(BaseModel):
    """Request to fetch For You page data."""

    session_id: Optional[str] = None
    email: Optional[EmailStr] = None

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "abc-123-def-456",
                "email": None,
            }
        }


class ForYouResponse(BaseModel):
    """For You page dashboard response."""

    lead_profile: dict
    personalization: dict
    recommendations: dict
    insights: dict
    next_steps: list

    class Config:
        json_schema_extra = {
            "example": {
                "lead_profile": {"name": "Aanya", "email": "aanya@example.com"},
                "personalization": {"data_completeness": 75},
                "recommendations": {"universities": [], "scholarships": [], "costs": []},
                "insights": {"application_readiness": "in_progress"},
                "next_steps": [],
            }
        }


# ─── Endpoints ─────────────────────────────────────────────────────────


@router.get("/dashboard")
async def get_for_you_dashboard(
    session_id: Optional[str] = Query(None, description="Twilio call session ID"),
    email: Optional[str] = Query(None, description="User email"),
) -> ForYouResponse:
    """
    Fetch complete For You page dashboard.

    Requires either session_id or email. Returns personalized recommendations
    based on lead profile from Supabase, filtered through knowledge bases.

    Query Parameters:
    - session_id: Twilio call session ID (preferred)
    - email: User email (fallback)

    Returns:
    - Lead profile from call
    - Filtered universities matching lead's criteria
    - Matched scholarships based on eligibility
    - Cost of living recommendations
    - Personalized insights and next steps

    Example:
    ```
    GET /api/v1/for-you/dashboard?session_id=abc-123-def-456
    ```
    """
    if not session_id and not email:
        raise HTTPException(
            status_code=400,
            detail="Either session_id or email is required",
        )

    logger.info(f"Fetching For You dashboard: session_id={session_id}, email={email}")

    # Fetch caller from database
    lead = None
    if session_id:
        lead = await ForYouService.get_lead_by_session_id(session_id)
    elif email:
        lead = await ForYouService.get_lead_by_email(email)

    # Create default lead if not found (for new sessions)
    if not lead:
        logger.info(f"Creating default lead for session_id={session_id}, email={email}")
        lead = {
            "id": f"lead-{session_id[:8]}" if session_id else f"lead-{email.split('@')[0]}",
            "session_id": session_id,
            "email": email,
            "name": email.split("@")[0] if email else "Student",
            "target_countries": ["uk"],
            "course_interest": None,
            "gpa": None,
            "ielts_score": None,
            "budget": None,
            "scholarship_interest": False,
            "application_stage": "exploring",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    logger.info(f"Found lead: {lead.get('id')} - {lead.get('name')}")

    try:
        # Load knowledge bases
        universities = KBService.load_universities()
        scholarships = KBService.load_scholarships()
        cost_data = KBService.load_cost_of_living()

        logger.info(f"Loaded KB: {len(universities)} unis, {len(scholarships)} scholarships")

        # Build complete dashboard with recommendations
        dashboard_dict = ForYouService.build_for_you_dashboard(
            lead, universities, scholarships, cost_data
        )

        return ForYouResponse(**dashboard_dict)

    except Exception as e:
        logger.error(f"Error building For You dashboard: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to build dashboard: {str(e)}"
        )


@router.post("/profile")
async def get_lead_profile(request: ForYouRequest) -> dict:
    """
    Fetch lead profile without recommendations.

    Useful for frontend to check if lead exists and get basic profile info.

    Args:
        request: ForYouRequest with session_id or email

    Returns:
        Lead profile record from Supabase
    """
    if not request.session_id and not request.email:
        raise HTTPException(
            status_code=400,
            detail="Either session_id or email is required",
        )

    lead = None
    if request.session_id:
        lead = await ForYouService.get_lead_by_session_id(request.session_id)
    elif request.email:
        lead = await ForYouService.get_lead_by_email(request.email)

    if not lead:
        raise HTTPException(
            status_code=404,
            detail="Lead not found",
        )

    logger.info(f"Fetched lead profile: {lead.get('id')}")
    return lead


@router.get("/insights/{session_id}")
async def get_insights(session_id: str) -> dict:
    """
    Get personalized insights for a lead.

    Args:
        session_id: Twilio session ID

    Returns:
        Insights about application readiness, key actions, warnings, opportunities
    """
    lead = await ForYouService.get_lead_by_session_id(session_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    insights = ForYouService.get_personalized_insights(lead)
    logger.info(f"Generated insights for lead {session_id}")
    return insights


@router.post("/filter-universities")
async def filter_universities(
    session_id: str = Query(..., description="Lead session ID"),
    universities: list = None,  # From KB
) -> dict:
    """
    Get filtered universities based on lead profile.

    Args:
        session_id: Twilio session ID
        universities: List of universities from KB (optional)

    Returns:
        Filtered universities ranked by lead's profile match
    """
    lead = await ForYouService.get_lead_by_session_id(session_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # In production, universities would be loaded from KB
    if not universities:
        universities = []

    filtered = ForYouService.filter_universities_by_profile(lead, universities)
    logger.info(f"Filtered {len(filtered)} universities for lead {session_id}")
    return {"count": len(filtered), "universities": filtered[:10]}


@router.post("/match-scholarships")
async def match_scholarships(
    session_id: str = Query(..., description="Lead session ID"),
    scholarships: list = None,  # From KB
) -> dict:
    """
    Get matched scholarships based on lead profile.

    Args:
        session_id: Twilio session ID
        scholarships: List of scholarships from KB (optional)

    Returns:
        Matched scholarships ranked by eligibility and lead fit
    """
    lead = await ForYouService.get_lead_by_session_id(session_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # In production, scholarships would be loaded from KB
    if not scholarships:
        scholarships = []

    matched = ForYouService.match_scholarships_by_profile(lead, scholarships)
    logger.info(f"Matched {len(matched)} scholarships for lead {session_id}")
    return {"count": len(matched), "scholarships": matched[:10]}


@router.post("/cost-recommendations")
async def get_cost_recommendations(
    session_id: str = Query(..., description="Lead session ID"),
    cost_data: dict = None,  # From KB
) -> dict:
    """
    Get cost of living recommendations for a lead.

    Args:
        session_id: Twilio session ID
        cost_data: Cost of living data from KB (optional)

    Returns:
        Recommended cities with cost breakdowns based on lead's budget and targets
    """
    lead = await ForYouService.get_lead_by_session_id(session_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # In production, cost_data would be loaded from KB
    if not cost_data:
        cost_data = {}

    recommendations = ForYouService.get_cost_recommendations(lead, cost_data)
    logger.info(f"Generated cost recommendations for lead {session_id}")
    return {"count": len(recommendations), "recommendations": recommendations}


@router.post("/save-recommendations")
async def save_recommendations(
    phone: str = Query(..., description="Caller phone number"),
    universities: list = Query(default=[], description="Filtered universities"),
    scholarships: list = Query(default=[], description="Matched scholarships"),
) -> DataResponse:
    """
    Save filtered recommendations to caller profile.

    Persists the filtered universities list to the database for future reference.

    Args:
        phone: Caller phone number (MongoDB _id)
        universities: Filtered and ranked universities
        scholarships: Matched scholarships

    Returns:
        Updated caller record with saved recommendations
    """
    try:
        db = get_db()
        # Save recommendations to caller profile
        body = {
            "recommended_universities": [u.get("id") or u.get("name") for u in universities[:10]],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        result = await db.callers.update_one(
            {"_id": phone},
            {"$set": body}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail=f"Caller not found: {phone}")

        # Fetch and return updated document
        updated = await db.callers.find_one({"_id": phone})
        logger.info(f"Saved {len(universities)} recommendations for caller {phone}")
        return DataResponse(success=True, data=updated)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving recommendations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save recommendations: {str(e)}")


@router.get("/completeness/{phone}")
async def get_lead_completeness(phone: str) -> DataResponse:
    """
    Get data completeness information for a caller.

    Returns:
    - Current completeness percentage (0-100)
    - List of missing fields
    - Recommendations for improvement

    Args:
        phone: Caller phone number

    Returns:
        Completeness data with missing fields and improvement recommendations
    """
    try:
        db = get_db()
        # Fetch caller from database
        caller = await db.callers.find_one({"_id": phone})

        if not caller:
            raise HTTPException(status_code=404, detail=f"Caller not found: {phone}")

        # Calculate completeness and get recommendations
        completeness = LeadScoringService.calculate_data_completeness(caller)
        missing = LeadScoringService.get_missing_fields(caller)
        improvements = LeadScoringService.get_improvement_recommendations(caller, missing)

        completeness_data = {
            "phone": phone,
            "completeness_percentage": completeness,
            "missing_fields": missing,
            "improvement_recommendations": improvements,
            "next_priority": improvements[0] if improvements else None,
        }

        logger.info(f"Calculated completeness {completeness}% for caller {phone}")
        return DataResponse(success=True, data=completeness_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating completeness: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate completeness: {str(e)}")


@router.patch("/update-completeness/{phone}")
async def update_lead_completeness(phone: str) -> DataResponse:
    """
    Calculate and update data completeness score in the database.

    Args:
        phone: Caller phone number

    Returns:
        Updated caller record with new completeness score
    """
    try:
        db = get_db()
        # Fetch current caller
        caller = await db.callers.find_one({"_id": phone})

        if not caller:
            raise HTTPException(status_code=404, detail=f"Caller not found: {phone}")

        # Calculate new completeness and scores
        completeness = LeadScoringService.calculate_data_completeness(caller)
        lead_score = LeadScoringService.calculate_lead_score(caller)
        intent_score = LeadScoringService.calculate_intent_score(caller)
        financial_score = LeadScoringService.calculate_financial_score(caller)
        timeline_score = LeadScoringService.calculate_timeline_score(caller)

        # Update database
        body = {
            "data_completeness": completeness,
            "lead_score": lead_score,
            "intent_score": intent_score,
            "financial_score": financial_score,
            "timeline_score": timeline_score,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        result = await db.callers.update_one(
            {"_id": phone},
            {"$set": body}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail=f"Caller not found: {phone}")

        # Fetch and return updated document
        updated = await db.callers.find_one({"_id": phone})
        logger.info(f"Updated scores for caller {phone}: completeness={completeness}, lead_score={lead_score}")
        return DataResponse(success=True, data=updated)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating completeness: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update completeness: {str(e)}")


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok", "service": "for-you"}
