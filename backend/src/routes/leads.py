from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Query, Request, HTTPException
from pydantic import BaseModel

from src.db.supabase_client import supabase
from src.models.responses import DataResponse, PaginatedResponse, PaginationInfo
from src.utils.logger import logger

router = APIRouter(prefix="/api/leads")


class LeadUpdate(BaseModel):
    """Validated lead update model to prevent arbitrary field updates."""

    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    education_level: Optional[str] = None
    field: Optional[str] = None
    institution: Optional[str] = None
    gpa: Optional[float] = None
    target_countries: Optional[list] = None
    course_interest: Optional[str] = None
    intake_timing: Optional[str] = None
    ielts_score: Optional[float] = None
    pte_score: Optional[float] = None
    budget_range: Optional[str] = None
    budget_status: Optional[str] = None
    scholarship_interest: Optional[bool] = None
    timeline: Optional[str] = None
    application_stage: Optional[str] = None
    persona_type: Optional[str] = None
    lead_score: Optional[int] = None
    intent_score: Optional[int] = None
    financial_score: Optional[int] = None
    timeline_score: Optional[int] = None
    classification: Optional[str] = None
    data_completeness: Optional[int] = None
    emotional_anxiety: Optional[str] = None
    emotional_confidence: Optional[str] = None
    emotional_urgency: Optional[str] = None
    callback_requested: Optional[bool] = None
    competitor_mentioned: Optional[bool] = None
    ielts_upsell_flag: Optional[bool] = None
    counsellor_brief: Optional[str] = None
    recommended_universities: Optional[list] = None
    unresolved_objections: Optional[list] = None

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john@example.com",
                "classification": "Warm",
                "lead_score": 75,
            }
        }


# GET /api/leads
@router.get("")
async def list_leads(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    classification: Optional[str] = Query(None, description="Filter by Hot/Warm/Cold"),
    search: Optional[str] = Query(None, description="Search by name or email"),
) -> PaginatedResponse:
    """
    List all leads with pagination and filtering.

    Query Parameters:
    - page: Page number (1-indexed)
    - limit: Results per page (1-100)
    - classification: Filter by Hot/Warm/Cold
    - search: Search by name or email

    Returns:
    - data: Array of lead records
    - pagination: Pagination metadata
    """
    try:
        offset = (page - 1) * limit

        query = (
            supabase.table("leads")
            .select("id, name, email, phone, classification, lead_score, created_at, updated_at", count="exact")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if classification and classification in ["Hot", "Warm", "Cold"]:
            query = query.eq("classification", classification)
        if search:
            query = query.or_(f"name.ilike.%{search}%,email.ilike.%{search}%")

        result = query.execute()

        pagination = {
            "total": result.count or 0,
            "page": page,
            "limit": limit,
            "pages": ((result.count or 0) + limit - 1) // limit if result.count else 0,
        }
        return PaginatedResponse(success=True, data=result.data or [], pagination=pagination)
    except Exception as exc:
        logger.error(f"Leads list error: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch leads: {str(exc)}")


# GET /api/leads/{lead_id}
@router.get("/{lead_id}")
async def get_lead(lead_id: str) -> DataResponse:
    """
    Get detailed information for a specific lead.

    Path Parameters:
    - lead_id: UUID of the lead

    Returns:
    - Complete lead profile with call session information
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
        logger.error(f"Leads get error: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch lead: {str(exc)}")


# PATCH /api/leads/{lead_id}
@router.patch("/{lead_id}")
async def update_lead(lead_id: str, update_data: LeadUpdate) -> DataResponse:
    """
    Update a lead's profile information.

    Path Parameters:
    - lead_id: UUID of the lead

    Request Body:
    - LeadUpdate model with fields to update (all optional)

    Returns:
    - Updated lead record

    Note: Only specified fields are updated; others are left unchanged.
    updated_at timestamp is automatically set.
    """
    try:
        # Convert update_data to dict, removing None values
        body = update_data.dict(exclude_none=True)
        if not body:
            raise HTTPException(status_code=400, detail="No fields to update")

        # Add updated_at timestamp
        body["updated_at"] = datetime.now(timezone.utc).isoformat()

        # Validate classification if provided
        if "classification" in body and body["classification"] not in ["Hot", "Warm", "Cold"]:
            raise HTTPException(
                status_code=400,
                detail="classification must be one of: Hot, Warm, Cold"
            )

        # Validate scores if provided
        for score_field in ["lead_score", "intent_score", "financial_score", "timeline_score"]:
            if score_field in body:
                if not isinstance(body[score_field], int) or not (0 <= body[score_field] <= 100):
                    raise HTTPException(
                        status_code=400,
                        detail=f"{score_field} must be an integer between 0 and 100"
                    )

        result = (
            supabase.table("leads")
            .update(body)
            .eq("id", lead_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail=f"Lead not found: {lead_id}")

        return DataResponse(success=True, data=result.data[0])
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Leads update error: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to update lead: {str(exc)}")
