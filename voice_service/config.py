from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# Load root-level .env for local development.
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_phone_number: str
    base_url: str

    sarvam_api_key: str

    http_timeout_sec: int
    max_turns_per_call: int


def get_settings() -> Settings:
    return Settings(
        twilio_account_sid=os.getenv("TWILIO_ACCOUNT_SID", ""),
        twilio_auth_token=os.getenv("TWILIO_AUTH_TOKEN", ""),
        twilio_phone_number=os.getenv("TWILIO_PHONE_NUMBER", ""),
        base_url=os.getenv("VOICE_BOT_BASE_URL", "http://localhost:8000").rstrip("/"),
        sarvam_api_key=os.getenv("SARVAM_API_KEY", ""),
        http_timeout_sec=int(os.getenv("HTTP_TIMEOUT_SEC", "25")),
        max_turns_per_call=int(os.getenv("MAX_TURNS_PER_CALL", "4")),
    )
