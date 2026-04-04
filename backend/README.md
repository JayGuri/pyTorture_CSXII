# Fateh Education Backend

Simplified FastAPI backend for the Fateh Education AI voice agent.

This backend is intentionally lean:

- Telephony: Twilio
- STT: Groq Whisper
- LLM: Featherless (Gemma) primary with Gemini fallback
- TTS: Sarvam AI
- Database: MongoDB Atlas
- Runtime: FastAPI + Uvicorn

The older Supabase, Redis, RAG, cron-job, and multi-provider voice stack has been removed.

## What This Backend Does

- Accepts inbound Twilio voice calls
- Lets the caller choose English, Hindi, or Marathi
- Transcribes the caller audio with Groq Whisper
- Generates a voice-ready counsellor reply with Featherless and falls back to Gemini when needed
- Synthesizes audio with Sarvam and serves it back to Twilio
- Stores caller profile, lead score, call history, and persistent memory in MongoDB
- Handles both first-time onboarding and returning callers

## Key Behavior

### First-Time Caller

- Caller is identified by phone number
- If the phone number does not exist in MongoDB, a new caller document is created
- The system prompt switches into onboarding mode
- Priya introduces herself briefly and starts collecting core lead information naturally

### Returning Caller

- Existing caller document is loaded using normalized phone number
- Previous memory summary and recent messages are added to the LLM context
- The system prompt switches into returning-caller mode
- Priya continues from prior context instead of restarting the conversation

## Tech Stack

| Layer | Service |
| --- | --- |
| API | FastAPI |
| Server | Uvicorn |
| Database | MongoDB Atlas via Motor |
| Telephony | Twilio |
| STT | Groq Whisper |
| LLM | Featherless (primary) + Google Gemini (fallback) |
| TTS | Sarvam AI |
| Logging | Loguru |

## Project Structure

```text
backend/
├── src/
│   ├── main.py
│   ├── config/
│   │   └── env.py
│   ├── db/
│   │   └── mongo_client.py
│   ├── models/
│   │   ├── caller.py
│   │   └── types.py
│   ├── middleware/
│   │   ├── auth.py
│   │   └── error_handler.py
│   ├── routes/
│   │   ├── dashboard.py
│   │   ├── health.py
│   │   └── twilio_webhook.py
│   ├── services/
│   │   ├── llm/
│   │   │   ├── featherless.py
│   │   │   ├── gemini.py
│   │   │   └── router.py
│   │   ├── stt/
│   │   │   └── groq_whisper.py
│   │   ├── tts/
│   │   │   └── sarvam.py
│   │   └── voice_agent/
│   │       ├── extractor.py
│   │       ├── memory.py
│   │       ├── orchestrator.py
│   │       ├── prompt_builder.py
│   │       └── scorer.py
│   └── utils/
│       ├── helpers.py
│       └── logger.py
├── tests/
├── requirements.txt
└── .env
```

## Requirements

- Python 3.11+ recommended
- MongoDB Atlas database
- Twilio phone number with voice webhook support
- Public HTTPS URL for Twilio callbacks, such as ngrok

## Installation

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
```

## Environment Variables

Create `backend/.env`:

```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
PUBLIC_URL=https://your-public-url.ngrok-free.app

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+14155550123

# STT
GROQ_API_KEY=your_groq_api_key

# LLM
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MAX_RETRIES=1
GEMINI_RETRY_BACKOFF_BASE_SEC=0.5
GEMINI_QUOTA_COOLDOWN_SEC=30

LLM_PRIMARY_PROVIDER=featherless
GEMINI_FALLBACK_MIN_BUDGET_SEC=0.65

FEATHERLESS_API_KEY=your_featherless_api_key
FEATHERLESS_MODEL=google/gemma-3-4b-it
FEATHERLESS_BASE_URL=https://api.featherless.ai/v1
FEATHERLESS_TIMEOUT_SEC=2.5
FEATHERLESS_MAX_RETRIES=1
FEATHERLESS_RETRY_BACKOFF_BASE_SEC=0.35
FEATHERLESS_FAILURE_COOLDOWN_SEC=45
FEATHERLESS_MAX_OUTPUT_TOKENS=256

# TTS
SARVAM_API_KEY=your_sarvam_api_key
SARVAM_API_KEY_FALLBACK=your_optional_backup_sarvam_key
SARVAM_TTS_URL=https://api.sarvam.ai/text-to-speech
SARVAM_TTS_MODEL=bulbul:v3
SARVAM_TTS_DEFAULT_SPEAKER=priya
SARVAM_TTS_MAX_CHARS=500

# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/fateh?retryWrites=true&w=majority

# Call settings
MAX_TURNS_PER_CALL=8
MAX_CONTEXT_MESSAGES=20
CONTEXT_SUMMARY_THRESHOLD=16
ORCHESTRATOR_TIMEOUT_SEC=8.0
STT_REPROMPT_LIMIT=2
WEBHOOK_RECORDING_DOWNLOAD_TIMEOUT_SEC=5.0
GROQ_STT_TIMEOUT_SEC=5.0
SARVAM_TTS_TIMEOUT_SEC=5.0
TWILIO_WEBHOOK_FAST_DEADLINE_MODE=true
WEBHOOK_INTERNAL_BUDGET_SEC=13.5
WEBHOOK_MIN_TTS_BUDGET_SEC=1.0
WEBHOOK_TTS_BUDGET_GUARD_SEC=0.35
WEBHOOK_MIN_ORCHESTRATOR_BUDGET_SEC=0.75
```

## Run Locally

```bash
cd backend
uvicorn src.main:app --host 0.0.0.0 --port 5000 --reload
```

Backend root:

```text
GET http://localhost:5000/
```

Health check:

```text
GET http://localhost:5000/api/health
```

## Twilio Webhook Setup

Configure your Twilio number with:

- Voice webhook: `POST {PUBLIC_URL}/webhooks/twilio/voice`
- Status callback: `POST {PUBLIC_URL}/webhooks/twilio/status`
- Compatibility callback also supported: `POST {PUBLIC_URL}/webhooks/twilio/voice/status`

The backend expects `PUBLIC_URL` to be a publicly reachable HTTPS URL.

## Voice Call Flow

1. `POST /webhooks/twilio/voice`
2. Caller selects language using DTMF
3. `POST /webhooks/twilio/language`
4. Twilio records the caller utterance
5. `POST /webhooks/twilio/process-turn`
6. Backend downloads recording from Twilio
7. Groq Whisper transcribes the audio
8. Featherless generates the counsellor reply (Gemini fallback on timeout or provider errors)
9. Sarvam synthesizes reply audio
10. Twilio plays audio and records the next turn
11. `POST /webhooks/twilio/status` or `POST /webhooks/twilio/voice/status` finalizes the call record

## MongoDB Model

Primary collection: `callers`

Important fields:

- `phone`: unique caller identity in E.164 format
- `name`, `email`, `location`
- `education_level`, `field`, `institution`, `gpa`
- `target_countries`, `course_interest`, `intake_timing`
- `test_type`, `test_score`, `test_stage`
- `budget_range`, `budget_status`, `scholarship_interest`
- `lead_score`, `classification`
- `memory.summary`, `memory.messages`, `memory.topics_discussed`
- `calls[]` for call history

Indexes created at startup:

- unique index on `phone`
- index on `classification`
- index on `lead_score`
- index on `last_contact`

## Memory Model

The backend keeps two levels of conversation state:

- In-memory per-call state for active calls
- Persistent MongoDB memory for cross-call continuity

Persistent memory includes:

- rolling recent messages
- an automatically generated summary when the message threshold is exceeded
- lifetime turn count
- tracked topics discussed

This lets returning callers resume naturally without replaying their profile every time.

## Lead Extraction and Scoring

The backend uses rule-based extraction, not ML classifiers, for stability.

Extracted data includes:

- name
- location
- education level
- field of study
- target country
- course interest
- test status and score
- budget
- intake timing
- scholarship interest
- GPA
- institution

Lead score is recalculated after each turn and classified as:

- `Hot`
- `Warm`
- `Cold`

## TTS Delivery

Sarvam returns audio bytes. Twilio needs a URL for playback.

The backend:

- caches generated audio in memory with a short TTL
- exposes the audio at `GET /tts/{token}`
- returns that URL to Twilio through `<Play>`

If Sarvam fails, the backend falls back to Twilio `<Say>`.

## API Endpoints

### Core

- `GET /`
- `GET /api/health`

### Dashboard

- `GET /api/dashboard/overview`
- `GET /api/dashboard/callers`
- `GET /api/dashboard/callers/{phone}`

### Twilio

- `POST /webhooks/twilio/voice`
- `POST /webhooks/twilio/language`
- `POST /webhooks/twilio/process-turn`
- `POST /webhooks/twilio/status`
- `POST /webhooks/twilio/voice/status`

### TTS

- `GET /tts/{token}`

## Reliability Rules

- STT failure: reprompt up to `STT_REPROMPT_LIMIT`
- Featherless timeout/error/empty response: fall back to Gemini in the same turn
- LLM timeout or dual-provider failure: use a safe fallback spoken reply
- LLM quota exhaustion: enter provider cooldown and continue call with static fallback replies
- TTS failure: fall back to Twilio `<Say>`
- Twilio webhook deadline mode: preserves an internal time budget and falls back early to `<Say>` when budget is low, so Twilio gets TwiML before the 15s timeout
- In fast deadline mode, Sarvam TTS limits retries in webhook context to reduce timeout risk
- MongoDB write failure: log and continue call where possible
- Twilio duplicate recording callbacks are deduplicated in memory

## Testing

Run tests:

```bash
cd backend
pytest
```

Current tests cover:

- phone normalization
- caller document defaults
- active call state lifecycle
- extractor behavior
- scoring behavior
- prompt mode differences for first-time vs returning callers
- basic route behavior

## Useful Notes

- Twilio signature validation is skipped in development mode and enforced in production-like environments.
- `PUBLIC_URL` should not include a path.
- The health check performs live checks against MongoDB, Groq, Featherless, Gemini, Sarvam, and `PUBLIC_URL`.
- Recent conversation history is capped to keep prompts fast and cheap.

## Main Files to Read First

- [src/main.py](./src/main.py)
- [src/routes/twilio_webhook.py](./src/routes/twilio_webhook.py)
- [src/services/voice_agent/orchestrator.py](./src/services/voice_agent/orchestrator.py)
- [src/services/voice_agent/prompt_builder.py](./src/services/voice_agent/prompt_builder.py)
- [src/services/voice_agent/memory.py](./src/services/voice_agent/memory.py)
- [src/db/mongo_client.py](./src/db/mongo_client.py)
