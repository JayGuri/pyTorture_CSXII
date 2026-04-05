"""
Leads Management API Routes

REST API for CRUD operations on leads/callers in MongoDB.
Used by admin dashboard for viewing and managing leads.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from src.db.mongo_client import get_db
from src.models.responses import DataResponse, PaginatedResponse, PaginationInfo
from src.utils.logger import logger

router = APIRouter(prefix="/api/leads")


class LeadUpdate(BaseModel):
    """Validated lead/caller update model to prevent arbitrary field updates."""

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
    test_type: Optional[str] = None
    test_score: Optional[float] = None
    test_stage: Optional[str] = None
    budget_range: Optional[str] = None
    budget_status: Optional[str] = None
    scholarship_interest: Optional[bool] = None
    callback_requested: Optional[bool] = None
    competitor_mentioned: Optional[bool] = None
    ielts_upsell_flag: Optional[bool] = None
    con_session_req: Optional[str] = None
    lead_score: Optional[int] = None
    classification: Optional[str] = None


@router.get("")
async def list_leads(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    classification: Optional[str] = Query(None, description="Filter by classification (Hot/Warm/Cold)"),
    search: Optional[str] = Query(None, description="Search by phone, name, or email"),
) -> PaginatedResponse:
    """
    Get paginated list of leads/callers with optional filtering and search.

    Query Parameters:
    - page: Page number (default 1)
    - limit: Items per page (default 20, max 100)
    - classification: Filter by classification (Hot/Warm/Cold)
    - search: Search by phone number, name, or email (regex)

    Returns:
        Paginated list of callers with total count and pagination info
    """
    try:
        db = get_db()

        # Build filter query
        filter_query: Dict[str, Any] = {}
        if classification:
            filter_query["classification"] = classification

        if search:
            # Search in phone, name, email (case-insensitive regex)
            search_pattern = {"$regex": search, "$options": "i"}
            filter_query["$or"] = [
                {"_id": search_pattern},  # phone
                {"name": search_pattern},
                {"email": search_pattern},
            ]

        # Get total count
        total = await db.callers.count_documents(filter_query)

        # Calculate pagination
        skip = (page - 1) * limit
        pages = (total + limit - 1) // limit

        # Fetch paginated results, sorted by last_contact descending
        callers = await (
            db.callers.find(filter_query)
            .sort("last_contact", -1)
            .skip(skip)
            .limit(limit)
            .to_list(length=limit)
        )

        # Remove MongoDB _id ObjectId and use phone as id
        for caller in callers:
            caller["id"] = caller.pop("_id")

        pagination = PaginationInfo(
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        )

        logger.info(f"Listed {len(callers)} callers: page={page}, total={total}")
        return PaginatedResponse(
            success=True,
            data=callers,
            pagination=pagination,
        )

    except Exception as e:
        logger.error(f"Error listing leads: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list leads: {str(e)}")


@router.get("/{phone}")
async def get_lead_detail(phone: str) -> DataResponse:
    """
    Get full details of a single caller/lead by phone number.

    Path Parameters:
    - phone: Caller phone number

    Returns:
        Complete caller record with all fields including calls history
    """
    try:
        db = get_db()
        caller = await db.callers.find_one({"_id": phone})

        if not caller:
            raise HTTPException(status_code=404, detail=f"Caller not found: {phone}")

        # Rename _id to id for API response
        caller["id"] = caller.pop("_id")

        logger.info(f"Retrieved lead detail for {phone}")
        return DataResponse(success=True, data=caller)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching lead {phone}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch lead: {str(e)}")


@router.patch("/{phone}")
async def update_lead(phone: str, update_data: LeadUpdate) -> DataResponse:
    """
    Update specific fields of a caller/lead record.

    Path Parameters:
    - phone: Caller phone number

    Request Body:
        Fields to update (only specified fields will be modified)

    Returns:
        Updated caller record
    """
    try:
        db = get_db()

        # Check if caller exists
        caller = await db.callers.find_one({"_id": phone})
        if not caller:
            raise HTTPException(status_code=404, detail=f"Caller not found: {phone}")

        # Prepare update body - only include non-null fields
        body = update_data.dict(exclude_unset=True, exclude_none=True)
        if body:
            body["updated_at"] = datetime.now(timezone.utc).isoformat()

            # Update the record
            result = await db.callers.update_one(
                {"_id": phone},
                {"$set": body},
            )

            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail=f"Caller not found: {phone}")

        # Fetch and return updated record
        updated = await db.callers.find_one({"_id": phone})
        updated["id"] = updated.pop("_id")

        logger.info(f"Updated lead {phone}: {list(body.keys())}")
        return DataResponse(success=True, data=updated)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating lead {phone}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update lead: {str(e)}")
