# Fateh Voice Service (Twilio + Sarvam)

This service handles inbound Twilio voice calls, supports language selection (English/Hindi/Marathi), records caller speech, sends audio to Sarvam STT, analyzes transcript text, and replies back on the call.

## What is implemented

- Twilio webhook endpoints:
  - `POST /twilio/voice`
  - `POST /twilio/language`
  - `POST /twilio/process-recording`
- Language routing:
  - `1` -> English (`en-IN`)
  - `2` -> Hindi (`hi-IN`)
  - `3` -> Marathi (`mr-IN`)
- STT extraction:
  - Downloads Twilio recording audio
  - Sends audio to Sarvam STT endpoint
- Transcript analysis:
  - Intent classification
  - Sentiment classification
  - Entity extraction (budget mentions, test scores, intake mentions)
- Reply generation:
  - Uses Sarvam chat endpoint (if enabled)
  - Falls back to deterministic local responses on failures
- Call analytics logging:
  - Writes JSONL records to `voice_service/data/call_analytics.jsonl`

## 1) Install dependencies

```bash
pip install -r voice_service/requirements.txt
```

## 2) Fill `.env`

Update the root `.env` file with:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `VOICE_BOT_BASE_URL` (public URL reachable by Twilio)
- `SARVAM_API_KEY`

## 3) Run the backend

```bash
uvicorn voice_service.app:app --host 0.0.0.0 --port 8000 --reload
```

## 4) Expose service publicly for Twilio (local dev)

If running locally, start an ngrok tunnel:

```bash
ngrok http 8000
```

Then set in `.env`:

- `VOICE_BOT_BASE_URL=https://<your-ngrok-id>.ngrok-free.app`

Restart the backend after updating `.env`.

## 5) Twilio Console setup (manual)

In Twilio Console -> Phone Numbers -> Active Numbers -> your number:

- **A call comes in** -> Webhook
- Method: `HTTP POST`
- URL: `https://<your-public-domain>/twilio/voice`

Save configuration.

## 6) Validate quickly

- Open: `GET /health` and confirm `{"ok": true, ...}`
- Place a test call to your Twilio number.
- Select language with keypad.
- Ask a question.
- Check logs in `voice_service/data/call_analytics.jsonl`.

## Notes on Sarvam API contract

The service now uses built-in Sarvam defaults for auth header, STT/chat endpoints, and model names. You only need `SARVAM_API_KEY`.

If your Sarvam account uses a different payload schema, update:

- `voice_service/sarvam_client.py`

The rest of the Twilio call flow and analytics pipeline will continue to work.
