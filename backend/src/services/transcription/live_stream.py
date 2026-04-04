from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Literal, Optional

import socketio

# Module-level Socket.IO server instance
_sio: Optional[socketio.AsyncServer] = None


def set_sio(sio: socketio.AsyncServer) -> None:
    global _sio
    _sio = sio


def get_sio() -> Optional[socketio.AsyncServer]:
    return _sio


SpeakerRole = Literal["student", "ai"]


async def broadcast_transcript(
    session_id: str,
    text: str,
    is_final: bool,
    role: SpeakerRole,
) -> None:
    if not _sio or not session_id or not text.strip():
        return

    await _sio.emit(
        "transcript",
        {
            "sessionId": session_id,
            "text": text,
            "isFinal": is_final,
            "role": role,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        room=f"session:{session_id}",
    )


async def broadcast_score_update(
    session_id: str,
    score: int,
    classification: str,
    intent_score: int,
    financial_score: int,
    timeline_score: int,
) -> None:
    if not _sio:
        return
    await _sio.emit(
        "score_update",
        {
            "score": score,
            "classification": classification,
            "intent_score": intent_score,
            "financial_score": financial_score,
            "timeline_score": timeline_score,
        },
        room=f"session:{session_id}",
    )


async def broadcast_lead_update(session_id: str, lead_data: Dict[str, Any]) -> None:
    if not _sio:
        return
    await _sio.emit("lead_update", lead_data, room=f"session:{session_id}")


async def broadcast_session_end(session_id: str, lead_data: Dict[str, Any]) -> None:
    if not _sio:
        return
    await _sio.emit(
        "session_end",
        {
            "sessionId": session_id,
            "leadData": lead_data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        room=f"session:{session_id}",
    )
