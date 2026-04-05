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
        logger.error(f"Dashboard callers error: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch callers") from exc


@router.get("/callers/{phone}")
async def get_caller(phone: str):
    try:
        db = get_db()
        caller = await db.callers.find_one({"phone": normalize_phone(phone) or phone})
        if not caller:
            raise HTTPException(status_code=404, detail="Caller not found")
        return serialize_mongo(caller)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Dashboard caller detail error: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch caller") from exc


@router.get("/active-sessions")
async def get_active_sessions(
    status: str | None = Query(default=None, description="Filter by call status (active/ringing)"),
):
    """
    Get list of currently active or ringing call sessions.

    Query Parameters:
    - status: Filter by call status (active, ringing). If not specified, returns both.

    Returns:
        List of active/ringing calls with caller information
    """
    try:
        db = get_db()

        # Build match filter for active/ringing calls
        statuses = ["active", "ringing"]
        if status and status in statuses:
            statuses = [status]

        # Aggregation pipeline to get callers with active/ringing calls
        pipeline = [
            {"$match": {"calls": {"$exists": True}}},
            {"$unwind": "$calls"},
            {"$match": {"calls.status": {"$in": statuses}}},
            {"$sort": {"calls.started_at": -1}},
            {
                "$project": {
                    "_id": 0,
                    "phone": "$_id",
                    "name": 1,
                    "email": 1,
                    "classification": 1,
                    "lead_score": 1,
                    "call": "$calls",
                }
            },
        ]

        sessions = await db.callers.aggregate(pipeline).to_list(None)

        logger.info(f"Retrieved {len(sessions)} active sessions")
        return {
            "success": True,
            "data": sessions,
            "count": len(sessions),
        }
    except Exception as exc:
        logger.error(f"Dashboard active sessions error: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch active sessions") from exc
