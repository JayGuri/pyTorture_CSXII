from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Query

from src.db.supabase_client import supabase

router = APIRouter(prefix="/api/dashboard")


# GET /api/dashboard/overview
@router.get("/overview")
async def overview(date_from: Optional[str] = None):
    try:
        if not date_from:
            # Default: last 7 days
            from datetime import timedelta
            date_from = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

        hot_res = supabase.table("leads").select("*", count="exact").eq("classification", "Hot").gte("created_at", date_from).execute()
        warm_res = supabase.table("leads").select("*", count="exact").eq("classification", "Warm").gte("created_at", date_from).execute()
        cold_res = supabase.table("leads").select("*", count="exact").eq("classification", "Cold").gte("created_at", date_from).execute()

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        calls_res = supabase.table("call_sessions").select("*", count="exact").gte("created_at", today).execute()

        hot = hot_res.count or 0
        warm = warm_res.count or 0
        cold = cold_res.count or 0
        total = hot + warm + cold
        conversion_rate = round((hot / total) * 100) if total > 0 else 0

        return {
            "success": True,
            "data": {
                "hot": hot,
                "warm": warm,
                "cold": cold,
                "todayCalls": calls_res.count or 0,
                "conversionRate": conversion_rate,
                "total": total,
            },
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}


# GET /api/dashboard/leads
@router.get("/leads")
async def get_leads(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    classification: Optional[str] = None,
    search: Optional[str] = None,
):
    try:
        offset = (page - 1) * limit

        query = (
            supabase.table("leads")
            .select("*, call_sessions(twilio_call_sid, duration_seconds, language_detected)", count="exact")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
        )

        if classification:
            query = query.eq("classification", classification)
        if search:
            query = query.ilike("name", f"%{search}%")

        result = query.execute()

        return {
            "success": True,
            "data": result.data,
            "pagination": {"total": result.count, "page": page, "limit": limit},
        }
    except Exception as exc:
        return {"success": False, "error": str(exc)}


# GET /api/dashboard/leads/:id
@router.get("/leads/{lead_id}")
async def get_lead_detail(lead_id: str):
    result = (
        supabase.table("leads")
        .select("*, call_sessions(twilio_call_sid, transcript, duration_seconds, language_detected)")
        .eq("id", lead_id)
        .single()
        .execute()
    )

    if not result.data:
        return {"success": False, "error": "Lead not found"}
    return {"success": True, "data": result.data}


# GET /api/dashboard/active-sessions
@router.get("/active-sessions")
async def active_sessions():
    result = (
        supabase.table("call_sessions")
        .select("id, twilio_call_sid, caller_phone, status, language_detected, persona_type, created_at")
        .eq("status", "active")
        .order("created_at", desc=True)
        .execute()
    )

    return {"success": True, "data": result.data or []}


# GET /api/dashboard/funnel
@router.get("/funnel")
async def funnel():
    calls = supabase.table("call_sessions").select("*", count="exact").execute()
    qualified = supabase.table("leads").select("*", count="exact").gt("lead_score", "0").execute()
    hot = supabase.table("leads").select("*", count="exact").eq("classification", "Hot").execute()

    return {
        "success": True,
        "data": {
            "total_calls": calls.count or 0,
            "qualified": qualified.count or 0,
            "hot": hot.count or 0,
        },
    }


# GET /api/dashboard/faq-gaps
@router.get("/faq-gaps")
async def faq_gaps(
    status: str = Query(default="pending"),
    limit: int = Query(default=50, ge=1, le=200),
):
    result = (
        supabase.table("kb_gaps")
        .select("*")
        .eq("status", status)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    return {"success": True, "data": result.data or []}
