from __future__ import annotations

import ipaddress
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings

# Load .env files (same order as TS: root first, then backend)
_backend_dir = Path(__file__).resolve().parent.parent.parent
_root_dir = _backend_dir.parent

load_dotenv(_root_dir / ".env")
load_dotenv(_backend_dir / ".env", override=True)


class Settings(BaseSettings):
    # ─── Server ───
    PORT: int = Field(default=5000)
    NODE_ENV: str = Field(default="development")
    FRONTEND_URL: str = Field(default="http://localhost:5173")
    PUBLIC_URL: str = Field(default="http://localhost:5000")
    PUBLIC_URL_FAIL_FAST: bool = Field(default=False)

    # ─── Twilio ───
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str

    # ─── Sarvam AI (STT) ───
    SARVAM_API_KEY: str
    SARVAM_STT_PRIMARY_URL: str = Field(default="https://api.sarvam.ai/speech-to-text")
    SARVAM_STT_FALLBACK_URL: str = Field(default="https://api.sarvam.ai/speech-to-text")
    SARVAM_STT_MODEL: str = Field(default="saaras:v3")
    SARVAM_STT_FALLBACK_MODEL: str = Field(default="saarika:v2.5")
    SARVAM_STT_AUTH_HEADER: str = Field(default="api-subscription-key")
    SARVAM_STT_FALLBACK_AUTH_HEADER: str = Field(default="Authorization")
    SARVAM_STT_LANGUAGE_FIELD: str = Field(default="language_code")
    SARVAM_STT_FALLBACK_LANGUAGE_FIELD: str = Field(default="language")

    # ─── Featherless.ai (LLM) ───
    FEATHERLESS_API_KEY: str
    FEATHERLESS_MODEL: str = Field(default="meta-llama/Llama-3.1-8B-Instruct")
    FEATHERLESS_BASE_URL: str = Field(default="https://api.featherless.ai/v1")

    # ─── Supabase ───
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str

    # ─── Upstash Redis ───
    UPSTASH_REDIS_REST_URL: str
    UPSTASH_REDIS_REST_TOKEN: str

    # ─── Voice ───
    HTTP_TIMEOUT_SEC: int = Field(default=25)
    MAX_TURNS_PER_CALL: int = Field(default=4)
    STT_REPROMPT_LIMIT: int = Field(default=2)

    class Config:
        env_file = ".env"
        extra = "ignore"

    def normalized_public_url(self) -> str:
        return self.PUBLIC_URL.rstrip("/")

    def public_url_issues(self) -> list[str]:
        raw = self.PUBLIC_URL.strip()
        if not raw:
            return ["PUBLIC_URL is empty"]

        issues: list[str] = []
        parsed = urlparse(raw)

        if parsed.scheme not in {"http", "https"}:
            issues.append("PUBLIC_URL must use http or https")
        if not parsed.netloc:
            issues.append("PUBLIC_URL must include a host")
        if parsed.path not in {"", "/"}:
            issues.append("PUBLIC_URL must not include a path")

        host = (parsed.hostname or "").strip().lower()
        if host in {"localhost", "127.0.0.1"}:
            issues.append("PUBLIC_URL points to localhost")

        if host:
            try:
                host_ip = ipaddress.ip_address(host)
                if host_ip.is_private or host_ip.is_loopback:
                    issues.append("PUBLIC_URL points to a private or loopback IP")
            except ValueError:
                pass

        return issues

    def should_fail_fast_public_url(self) -> bool:
        if self.PUBLIC_URL_FAIL_FAST:
            return True
        return self.NODE_ENV.lower() in {"production", "staging"}


env = Settings()
