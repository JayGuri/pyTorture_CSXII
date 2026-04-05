"""
Call Sessions API Routes

REST API for querying call sessions stored in MongoDB.
Sessions are stored as embedded arrays in caller documents.
"""

from typing import Optional

from fastapi import APIRouter, Query, HTTPException

from src.db.mongo_client import get_db
from src.models.responses import DataResponse, PaginatedResponse, PaginationInfo
from src.utils.logger import logger

router = APIRouter(prefix="/api/sessions")


@router.get("")
async def list_sessions(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by call status"),
) -> PaginatedResponse:
    """
    Get paginated list of call sessions from all callers.

    Query Parameters:
    - page: Page number (default 1)
    - limit: Items per page (default 20, max 100)
    - status: Filter by call status (active, completed, dropped, no-answer)

    Returns:
        Paginated list of call sessions with pagination info
    """
    try:
        db = get_db()

        # Build aggregation pipeline
        match_stage = {}
        if status:
            match_stage["calls.status"] = status

        # Count total sessions
        pipeline = [
            {"$match": {"calls": {"$exists": True}}},
            {"$unwind": "$calls"},
        ]
        if match_stage:
            pipeline.append({"$match": match_stage})

        total = len(await db.callers.aggregate(pipeline).to_list(None))

        # Fetch paginated results
        skip = (page - 1) * limit
        pages = (total + limit - 1) // limit

        aggregation_pipeline = [
            {"$match": {"calls": {"$exists": True}}},
            {"$unwind": "$calls"},
        ]
        if match_stage:
            aggregation_pipeline.append({"$match": match_stage})

        aggregation_pipeline.extend([
            {"$sort": {"calls.started_at": -1}},
            {"$skip": skip},
            {"$limit": limit},
            {
                "$project": {
                    "_id": 0,
                    "phone": "$_id",
                    "name": 1,
                    "email": 1,
                    "call": "$calls",
                }
            },
        ])

        sessions = await db.callers.aggregate(aggregation_pipeline).to_list(limit)

        pagination = PaginationInfo(
            total=total,
            page=page,
            limit=limit,
            pages=pages,
        )

        logger.info(f"Listed {len(sessions)} sessions: page={page}, total={total}")
        return PaginatedResponse(
            success=True,
            data=sessions,
            pagination=pagination,
        )

    except Exception as e:
        logger.error(f"Error listing sessions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list sessions: {str(e)}")


@router.get("/{call_sid}")
async def get_session_detail(call_sid: str) -> DataResponse:
    """
    Get full details of a single call session by call SID.

    Path Parameters:
    - call_sid: Twilio call session ID

    Returns:
        Call session record with associated caller information
    """
    try:
        db = get_db()

        # Find caller with matching call_sid in calls array
        caller = await db.callers.find_one(
            {"calls.call_sid": call_sid},
            projection={"_id": 1, "name": 1, "email": 1, "phone": 1, "calls": 1},
        )

        if not caller:
            raise HTTPException(status_code=404, detail=f"Session not found: {call_sid}")

        # Extract the specific call record
        call_record = None
        for call in caller.get("calls", []):
            if call.get("call_sid") == call_sid:
                call_record = call
                break

        if not call_record:
            raise HTTPException(status_code=404, detail=f"Session not found: {call_sid}")

        # Build response with caller and session data
        response_data = {
            "phone": caller.get("_id"),
            "name": caller.get("name"),
            "email": caller.get("email"),
            "call": call_record,
        }

        logger.info(f"Retrieved session detail for {call_sid}")
        return DataResponse(success=True, data=response_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching session {call_sid}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch session: {str(e)}")
