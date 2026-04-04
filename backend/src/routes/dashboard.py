from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from src.db.mongo_client import get_db
from src.utils.helpers import normalize_phone, serialize_mongo
from src.utils.logger import logger

router = APIRouter(prefix="/api/dashboard")


@router.get("/overview")
async def overview():
    try:
        db = get_db()
        hot = await db.callers.count_documents({"classification": "Hot"})
        warm = await db.callers.count_documents({"classification": "Warm"})
        cold = await db.callers.count_documents({"classification": "Cold"})
        total = await db.callers.count_documents({})

        start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        today_pipeline = [
            {"$unwind": "$calls"},
            {"$match": {"calls.started_at": {"$gte": start_of_day}}},
            {"$count": "count"},
        ]
        today_result = await db.callers.aggregate(today_pipeline).to_list(length=1)
        today_calls = today_result[0]["count"] if today_result else 0

        conversion_rate = round((hot / total) * 100) if total else 0
        return {
            "hot": hot,
            "warm": warm,
            "cold": cold,
            "total": total,
            "todayCalls": today_calls,
            "conversionRate": conversion_rate,
        }
    except Exception as exc:
        logger.error(f"Dashboard overview error: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard overview") from exc


@router.get("/callers")
async def list_callers(
    classification: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
):
    try:
        db = get_db()
        query = {}
        if classification in {"Hot", "Warm", "Cold"}:
            query["classification"] = classification
        if search:
            query["$or"] = [
                {"phone": {"$regex": search, "$options": "i"}},
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
            ]

        total = await db.callers.count_documents(query)
        cursor = (
            db.callers.find(query, {"memory.messages": 0})
            .sort("last_contact", -1)
            .skip((page - 1) * limit)
            .limit(limit)
        )
        callers = [serialize_mongo(document) async for document in cursor]

        return {
            "data": callers,
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "pages": (total + limit - 1) // limit if total else 0,
            },
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}

=========
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
>>>>>>>>> Temporary merge branch 2
