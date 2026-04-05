from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware

from src.utils.logger import logger


def _is_twilio_webhook(path: str) -> bool:
    return path.startswith("/webhooks/twilio")


def _twiml_error_response() -> Response:
    body = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        "<Say voice=\"Polly.Raveena\">Sorry, we are facing a technical issue. Please try again shortly.</Say>"
        "<Hangup/>"
        "</Response>"
    )
    return Response(content=body, media_type="text/xml", status_code=200)


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            logger.error(f"Unhandled error on {request.url.path}: {exc}")
            if _is_twilio_webhook(request.url.path):
                return _twiml_error_response()
            return JSONResponse(status_code=500, content={"success": False, "error": "Internal server error"})
