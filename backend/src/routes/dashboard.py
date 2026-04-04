from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Query, HTTPException

from src.db.supabase_client import supabase
from src.models.responses import DataResponse, PaginatedResponse, OverviewResponse, FunnelResponse
from src.utils.logger import logger

router = APIRouter(prefix="/api/dashboard")


# GET /api/dashboard/overview
@router.get("/overview")
async def overview(date_from: Optional[str] = None) -> DataResponse[OverviewResponse]:
    """
    Get dashboard overview metrics.

    Query Parameters:
    - date_from: ISO format date string (default: last 7 days)

    Returns:
    - hot: Count of Hot leads
    - warm: Count of Warm leads
    - cold: Count of Cold leads
    - todayCalls: Calls made today
    - conversionRate: Hot leads as percentage of total
    - total: Total leads in period
    """
    try:
        if not date_from:
            # Default: last 7 days
            date_from = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

        hot_res = supabase.table("leads").select("id", count="exact").eq("classification", "Hot").gte("created_at", date_from).execute()
        warm_res = supabase.table("leads").select("id", count="exact").eq("classification", "Warm").gte("created_at", date_from).execute()
        cold_res = supabase.table("leads").select("id", count="exact").eq("classification", "Cold").gte("created_at", date_from).execute()

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        calls_res = supabase.table("call_sessions").select("id", count="exact").gte("created_at", today).execute()

        hot = hot_res.count or 0
        warm = warm_res.count or 0
        cold = cold_res.count or 0
        total = hot + warm + cold
        conversion_rate = round((hot / total) * 100) if total > 0 else 0

        overview_data = OverviewResponse(
            hot=hot,
            warm=warm,
            cold=cold,
            todayCalls=calls_res.count or 0,
            conversionRate=conversion_rate,
            total=total,
        )
        return DataResponse(success=True, data=overview_data)
    except Exception as exc:
        logger.error(f"Dashboard overview error: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch overview: {str(exc)}")


# GET /api/dashboard/leads
@router.get("/leads")
async def get_leads(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    classification: Optional[str] = None,
    search: Optional[str] = None,
) -> PaginatedResponse:
    """
    List all leads with pagination and filtering.

    Query Parameters:
    - page: Page number (1-indexed)
    - limit: Results per page (1-100)
    - classification: Filter by Hot/Warm/Cold
    - search: Search by name (case-insensitive)

    Returns:
    - data: Array of lead records with call session info
    - pagination: Pagination metadata
    """
    try:
        offset = (page - 1) * limit

        # Build query with specific call_sessions fields (not *)
        query = (
            supabase.table("leads")
            .select(
                """
                id, name, email, phone, classification, lead_score,
                created_at, updated_at,
                call_sessions(id, twilio_call_sid, duration_seconds, language_detected)
                """,
                count="exact"
            )
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if classification and classification in ["Hot", "Warm", "Cold"]:
            query = query.eq("classification", classification)
        if search:
            query = query.ilike("name", f"%{search}%")

        result = query.execute()

        pagination = {
            "total": result.count or 0,
            "page": page,
            "limit": limit,
            "pages": ((result.count or 0) + limit - 1) // limit if result.count else 0,
        }
        return PaginatedResponse(success=True, data=result.data or [], pagination=pagination)
    except Exception as exc:
        logger.error(f"Dashboard leads error: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch leads: {str(exc)}")


# GET /api/dashboard/leads/{lead_id}
@router.get("/leads/{lead_id}")
async def get_lead_detail(lead_id: str) -> DataResponse:
    """
    Get detailed information for a specific lead.

    Path Parameters:
    - lead_id: UUID of the lead

    Returns:
    - Lead profile with all fields
    - Associated call session information
    """
    try:
        result = (
            supabase.table("leads")
            .select(
                """
                *,
                call_sessions(
                    id, twilio_call_sid, caller_phone, status,
                    transcript, duration_seconds, language_detected,
                    created_at, ended_at
                )
                """
            )
            .eq("id", lead_id)
            .single()
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail=f"Lead not found: {lead_id}")

        return DataResponse(success=True, data=result.data)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Dashboard lead detail error: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch lead: {str(exc)}")


# GET /api/dashboard/active-sessions
@router.get("/active-sessions")
async def active_sessions(
    status: Optional[str] = Query(default="active", description="Session status: active, ringing, completed, dropped, no-answer")
) -> DataResponse:
    """
    List currently active call sessions.

    Query Parameters:
    - status: Filter by session status (default: active)

    Returns:
    - Array of active call sessions with metadata
    """
    try:
        # Validate status
        valid_statuses = ["ringing", "active", "completed", "dropped", "no-answer"]
        if status and status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )

        result = (
            supabase.table("call_sessions")
            .select("id, twilio_call_sid, caller_phone, status, language_detected, created_at")
            .eq("status", status or "active")
            .order("created_at", desc=True)
            .execute()
        )

        return DataResponse(success=True, data=result.data or [])
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Dashboard active sessions error: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch sessions: {str(exc)}")


# GET /api/dashboard/funnel
@router.get("/funnel")
async def funnel(date_from: Optional[str] = None) -> DataResponse[FunnelResponse]:
    """
    Get sales funnel metrics showing conversion progression.

    Query Parameters:
    - date_from: ISO format date string (default: all time)

    Returns:
    - total_calls: Total call sessions initiated
    - qualified: Leads with lead_score > 0
    - hot: Leads with Hot classification
    """
    try:
        # Build queries
        calls_query = supabase.table("call_sessions").select("id", count="exact")
        qualified_query = supabase.table("leads").select("id", count="exact").gt("lead_score", 0)
        hot_query = supabase.table("leads").select("id", count="exact").eq("classification", "Hot")

        # Add date filtering if provided
        if date_from:
            calls_query = calls_query.gte("created_at", date_from)
            qualified_query = qualified_query.gte("created_at", date_from)
            hot_query = hot_query.gte("created_at", date_from)

        calls_res = calls_query.execute()
        qualified_res = qualified_query.execute()
        hot_res = hot_query.execute()

        funnel_data = FunnelResponse(
            total_calls=calls_res.count or 0,
            qualified=qualified_res.count or 0,
            hot=hot_res.count or 0,
        )
        return DataResponse(success=True, data=funnel_data)
    except Exception as exc:
        logger.error(f"Dashboard funnel error: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch funnel: {str(exc)}")


# GET /api/dashboard/sessions/:session_id/onboarding-progress
@router.get("/sessions/{session_id}/onboarding-progress")
async def onboarding_progress(session_id: str):
    """
    Returns the onboarding Q&A status for a call session.
    Used by the dashboard to show a live structured brief.
    """
    try:
        result = (
            supabase.table("onboarding_questions")
            .select("question_key, question_text, status, answer, asked_at, answered_at, turn_number")
            .eq("session_id", session_id)
            .order("created_at")
            .execute()
        )
        total    = len(result.data) if result.data else 0
        answered = sum(1 for r in (result.data or []) if r["status"] == "answered")
        return {
            "success": True,
            "session_id": session_id,
            "questions": result.data or [],
            "progress": {
                "total":    total,
                "answered": answered,
                "pending":  total - answered,
                "pct":      round((answered / total) * 100) if total else 0,
            },
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}


# GET /api/dashboard/faq-gaps
@router.get("/faq-gaps")
async def faq_gaps(
    status: str = Query(default="pending", description="Gap status: pending, researching, resolved, dismissed"),
    limit: int = Query(default=50, ge=1, le=200),
) -> DataResponse:
    """
    List FAQ gaps from voice calls that need research.

    Query Parameters:
    - status: Filter by gap status (pending, researching, resolved, dismissed)
    - limit: Max results to return (1-200)

    Returns:
    - Array of unresolved FAQ questions from calls
    """
    try:
        # Validate status
        valid_statuses = ["pending", "researching", "resolved", "dismissed"]
        if status not in valid_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )

        result = (
            supabase.table("kb_gaps")
            .select(
                """
                id, session_id, question, status, created_at,
                leads(id, name, email, classification)
                """
            )
            .eq("status", status)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )

        return DataResponse(success=True, data=result.data or [])
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Dashboard FAQ gaps error: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch FAQ gaps: {str(exc)}")
