from __future__ import annotations

from fastapi import APIRouter, Query

from src.db.supabase_client import supabase

router = APIRouter(prefix="/api/sessions")


# GET /api/sessions
@router.get("")
async def list_sessions(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    offset = (page - 1) * limit

    result = (
        supabase.table("call_sessions")
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


# GET /api/sessions/:id
@router.get("/{session_id}")
async def get_session(session_id: str):
    result = (
        supabase.table("call_sessions")
        .select("*, leads(*)")
        .eq("id", session_id)
        .single()
        .execute()
    )

    if not result.data:
        return {"success": False, "error": "Session not found"}
    return {"success": True, "data": result.data}
