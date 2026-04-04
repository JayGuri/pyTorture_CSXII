from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Query, Request

from src.db.supabase_client import supabase

router = APIRouter(prefix="/api/leads")


# GET /api/leads
@router.get("")
async def list_leads(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    offset = (page - 1) * limit

    result = (
        supabase.table("leads")
        .select("*", count="exact")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    return {
        "success": True,
        "data": result.data,
        "pagination": {"total": result.count, "page": page, "limit": limit},
    }


# GET /api/leads/:id
@router.get("/{lead_id}")
async def get_lead(lead_id: str):
    result = (
        supabase.table("leads")
        .select("*, call_sessions(*)")
        .eq("id", lead_id)
        .single()
        .execute()
    )

    if not result.data:
        return {"success": False, "error": "Lead not found"}
    return {"success": True, "data": result.data}


# PATCH /api/leads/:id
@router.patch("/{lead_id}")
async def update_lead(lead_id: str, request: Request):
    body = await request.json()
    body["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        supabase.table("leads")
        .update(body)
        .eq("id", lead_id)
        .execute()
    )

    if not result.data:
        return {"success": False, "error": "Update failed"}
    return {"success": True, "data": result.data[0] if result.data else None}
