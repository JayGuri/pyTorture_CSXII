from __future__ import annotations

from typing import Any

import requests

from voice_service.config import Settings


class SarvamClient:
    STT_ENDPOINTS = (
        "https://api.sarvam.ai/speech-to-text",
        "https://api.sarvam.ai/v1/speech-to-text",
    )
    CHAT_ENDPOINTS = (
        "https://api.sarvam.ai/chat/completions",
        "https://api.sarvam.ai/v1/chat/completions",
    )
    STT_MODELS = ("saaras:v3", "saaras:v2")
    CHAT_MODEL = "sarvam-m"

    def __init__(self, settings: Settings):
        self.settings = settings

    def _auth_headers(self) -> dict[str, str]:
        headers: dict[str, str] = {}
        if self.settings.sarvam_api_key:
            api_key = self.settings.sarvam_api_key
            # Send common auth headers to be resilient across API gateway variants.
            headers["api-subscription-key"] = api_key
            headers["x-api-key"] = api_key
            headers["Authorization"] = f"Bearer {api_key}"
        return headers

    def _find_first_text(self, payload: Any) -> str:
        preferred_keys = ("transcript", "text", "output", "content", "message", "answer")

        if isinstance(payload, dict):
            for key in preferred_keys:
                value = payload.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()

            # OpenAI-style choices path support.
            if "choices" in payload and isinstance(payload["choices"], list) and payload["choices"]:
                choice = payload["choices"][0]
                if isinstance(choice, dict):
                    message = choice.get("message", {})
                    if isinstance(message, dict):
                        content = message.get("content")
                        if isinstance(content, str) and content.strip():
                            return content.strip()

            for value in payload.values():
                nested = self._find_first_text(value)
                if nested:
                    return nested

        if isinstance(payload, list):
            for item in payload:
                nested = self._find_first_text(item)
                if nested:
                    return nested

        if isinstance(payload, str) and payload.strip():
            return payload.strip()

        return ""

    def transcribe_audio(self, audio_bytes: bytes, language_code: str) -> str:
        if not self.settings.sarvam_api_key:
            return ""

        files = {
            "file": ("call_audio.wav", audio_bytes, "audio/wav"),
        }
        last_error = ""

        for endpoint in self.STT_ENDPOINTS:
            for model in self.STT_MODELS:
                data = {
                    "model": model,
                    "language_code": language_code,
                }

                try:
                    response = requests.post(
                        endpoint,
                        files=files,
                        data=data,
                        headers=self._auth_headers(),
                        timeout=self.settings.http_timeout_sec,
                    )
                    response.raise_for_status()
                    payload = response.json()
                    transcript = self._find_first_text(payload)
                    if transcript:
                        return transcript
                except requests.RequestException as exc:
                    last_error = str(exc)

        if last_error:
            raise RuntimeError(f"Sarvam STT failed for all default endpoints: {last_error}")
        return ""

    def generate_reply(self, text: str, language_code: str, analysis: dict[str, Any]) -> str:
        if not self.settings.sarvam_api_key:
            return ""

        system_prompt = (
            "You are a concise and helpful study-abroad phone assistant for Fateh Education. "
            "Reply in the same language as the caller (English, Hindi, or Marathi). "
            "Keep responses under 3 short sentences and include one practical next step."
        )

        payload = {
            "model": self.CHAT_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        f"Caller language: {language_code}.\n"
                        f"Transcript: {text}\n"
                        f"Analysis: {analysis}"
                    ),
                },
            ],
            "temperature": 0.3,
        }

        headers = {
            **self._auth_headers(),
            "Content-Type": "application/json",
        }

        last_error = ""
        for endpoint in self.CHAT_ENDPOINTS:
            try:
                response = requests.post(
                    endpoint,
                    json=payload,
                    headers=headers,
                    timeout=self.settings.http_timeout_sec,
                )
                response.raise_for_status()
                response_payload = response.json()
                reply = self._find_first_text(response_payload)
                if reply:
                    return reply
            except requests.RequestException as exc:
                last_error = str(exc)

        if last_error:
            raise RuntimeError(f"Sarvam chat failed for all default endpoints: {last_error}")
        return ""
