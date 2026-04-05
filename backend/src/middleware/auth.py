from __future__ import annotations

from fastapi import Request
from twilio.request_validator import RequestValidator

from src.config.env import env


class TwilioSignatureValidationError(Exception):
    pass


def _build_public_request_url(request: Request) -> str:
    url = f"{env.normalized_public_url()}{request.url.path}"
    if request.url.query:
        url = f"{url}?{request.url.query}"
    return url


async def validate_twilio_signature(request: Request) -> None:
    if not env.is_production():
        return

    signature = request.headers.get("x-twilio-signature", "")
    if not signature:
        raise TwilioSignatureValidationError("Missing Twilio signature header")

    form_data = await request.form()
    params = {key: str(value) for key, value in form_data.items()}

    validator = RequestValidator(env.TWILIO_AUTH_TOKEN)
    if not validator.validate(_build_public_request_url(request), params, signature):
        raise TwilioSignatureValidationError("Invalid Twilio signature")
