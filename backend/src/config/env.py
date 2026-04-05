from __future__ import annotations

import ipaddress
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_backend_dir = Path(__file__).resolve().parent.parent.parent
_root_dir = _backend_dir.parent

load_dotenv(_root_dir / ".env")
load_dotenv(_backend_dir / ".env", override=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=True)

    PORT: int = Field(default=5000)
    NODE_ENV: str = Field(default="development")
    FRONTEND_URL: str = Field(default="http://localhost:5173")
    PUBLIC_URL: str = Field(default="http://localhost:5000")

    TWILIO_ACCOUNT_SID: str = Field(default="")
    TWILIO_AUTH_TOKEN: str = Field(default="")
    TWILIO_PHONE_NUMBER: str = Field(default="")
    TWILIO_WHATSAPP_NUMBER: str = Field(default="")

    GROQ_STT_API_KEY: str = Field(default="")
    GROQ_API_KEY: str = Field(default="")
    GROQ_LLM_MODEL: str = Field(default="llama-3.1-8b-instant")
    GROQ_LLM_BASE_URL: str = Field(default="https://api.groq.com/openai/v1")
    GROQ_LLM_TIMEOUT_SEC: float = Field(default=2.5)
    GROQ_LLM_MAX_RETRIES: int = Field(default=1)
    GROQ_LLM_RETRY_BACKOFF_BASE_SEC: float = Field(default=0.2)
    GROQ_LLM_MAX_OUTPUT_TOKENS: int = Field(default=192)

    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = Field(default="gemini-2.5-flash")
    GEMINI_MAX_RETRIES: int = Field(default=1)
    GEMINI_RETRY_BACKOFF_BASE_SEC: float = Field(default=0.5)
    GEMINI_QUOTA_COOLDOWN_SEC: int = Field(default=30)

    LLM_PRIMARY_PROVIDER: str = Field(default="featherless")
    GEMINI_FALLBACK_MIN_BUDGET_SEC: float = Field(default=0.65)

    FEATHERLESS_API_KEY: str = Field(default="")
    FEATHERLESS_MODEL: str = Field(default="google/gemma-3-4b-it")
    FEATHERLESS_BASE_URL: str = Field(default="https://api.featherless.ai/v1")
    FEATHERLESS_TIMEOUT_SEC: float = Field(default=15)
    FEATHERLESS_MAX_RETRIES: int = Field(default=1)
    FEATHERLESS_RETRY_BACKOFF_BASE_SEC: float = Field(default=0.35)
    FEATHERLESS_FAILURE_COOLDOWN_SEC: int = Field(default=45)
    FEATHERLESS_MAX_OUTPUT_TOKENS: int = Field(default=256)

    SARVAM_API_KEY: str = Field(default="")
    SARVAM_API_KEY_FALLBACK: str = Field(default="")
    SARVAM_TTS_URL: str = Field(default="https://api.sarvam.ai/text-to-speech")
    SARVAM_TTS_MODEL: str = Field(default="bulbul:v2")
    SARVAM_TTS_DEFAULT_SPEAKER: str = Field(default="anushka")
    SARVAM_TTS_MAX_CHARS: int = Field(default=500)

    MONGODB_URI: str = Field(default="")

    MAX_TURNS_PER_CALL: int = Field(default=8)
    MAX_CONTEXT_MESSAGES: int = Field(default=20)
    CONTEXT_SUMMARY_THRESHOLD: int = Field(default=16)
    ORCHESTRATOR_TIMEOUT_SEC: float = Field(default=5.0)
    STT_REPROMPT_LIMIT: int = Field(default=2)

    HTTP_TIMEOUT_SEC: float = Field(default=10.0)
    WEBHOOK_RECORDING_DOWNLOAD_TIMEOUT_SEC: float = Field(default=10.0)
    GROQ_STT_TIMEOUT_SEC: float = Field(default=10.0)
    SARVAM_TTS_TIMEOUT_SEC: float = Field(default=10.0)
    TWILIO_WEBHOOK_FAST_DEADLINE_MODE: bool = Field(default=True)
    WEBHOOK_INTERNAL_BUDGET_SEC: float = Field(default=13.5)
    WEBHOOK_MIN_TTS_BUDGET_SEC: float = Field(default=1.0)
    WEBHOOK_TTS_BUDGET_GUARD_SEC: float = Field(default=0.35)
    WEBHOOK_MIN_ORCHESTRATOR_BUDGET_SEC: float = Field(default=0.75)
    TWILIO_RECORDING_DEDUPE_TTL_SEC: int = Field(default=600)
    TTS_CACHE_TTL_SEC: int = Field(default=60)

    def normalized_public_url(self) -> str:
        return self.PUBLIC_URL.rstrip("/")

    def is_production(self) -> bool:
        return self.NODE_ENV.strip().lower() in {"production", "staging"}

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
        if host in {"localhost", "127.0.0.1"} and self.is_production():
            issues.append("PUBLIC_URL points to localhost")

        if host:
            try:
                host_ip = ipaddress.ip_address(host)
                if (host_ip.is_private or host_ip.is_loopback) and self.is_production():
                    issues.append("PUBLIC_URL points to a private or loopback IP")
            except ValueError:
                pass

        return issues


env = Settings()
