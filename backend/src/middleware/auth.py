from __future__ import annotations

from fastapi import Request
from twilio.request_validator import RequestValidator

from src.config.env import env


class TwilioSignatureValidationError(Exception):
    pass


def _build_public_request_url(request: Request) -> str:
    base = env.normalized_public_url()
    url = f"{base}{request.url.path}"
    if request.url.query:
        url = f"{url}?{request.url.query}"
    return url


async def validate_twilio_signature(request: Request) -> None:
    """FastAPI dependency that validates Twilio webhook signatures.
    Skipped in development mode.
    """
    if env.NODE_ENV.lower() == "development":
        return

    signature = request.headers.get("x-twilio-signature", "")
    if not signature:
        raise TwilioSignatureValidationError("Missing Twilio signature header")

    url = _build_public_request_url(request)

    # Read form body
    form_data = await request.form()
    params = {k: str(v) for k, v in form_data.items()}

    validator = RequestValidator(env.TWILIO_AUTH_TOKEN)
    if not validator.validate(url, params, signature):
        raise TwilioSignatureValidationError("Invalid Twilio signature")
