from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config.env import env
from src.db.mongo_client import connect_db, disconnect_db
from src.middleware.error_handler import ErrorHandlerMiddleware
from src.routes.dashboard import router as dashboard_router
from src.routes.for_you import router as for_you_router
from src.routes.leads import router as leads_router
from src.routes.sessions import router as sessions_router
from src.routes.health import router as health_router
from src.routes.twilio_webhook import router as twilio_router
from src.services.tts.sarvam import router as tts_router
from src.services.whatsapp import check_and_send_session_reminders


SESSION_REMINDER_INTERVAL_SEC = 30 * 60  # Every 30 minutes


async def _session_reminder_loop():
    """Background loop that periodically sends counselling session reminders."""
    while True:
        try:
            await asyncio.sleep(SESSION_REMINDER_INTERVAL_SEC)
            count = await check_and_send_session_reminders()
            if count > 0:
                from src.utils.logger import logger
                logger.info(f"Session reminder cron completed | reminders_sent={count}")
        except asyncio.CancelledError:
            break
        except Exception:
            pass  # Errors are logged inside the function


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    reminder_task = asyncio.create_task(_session_reminder_loop())
    yield
    reminder_task.cancel()
    try:
        await reminder_task
    except asyncio.CancelledError:
        pass
    await disconnect_db()


app = FastAPI(
    title="Fateh Education Voice Backend",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[env.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(twilio_router, prefix="/webhooks/twilio")
app.include_router(health_router)
app.include_router(dashboard_router)
app.include_router(for_you_router)
app.include_router(leads_router)
app.include_router(sessions_router)
app.include_router(tts_router)


@app.get("/")
async def root():
    return {
        "service": "fateh-voice-backend",
        "status": "running",
        "version": "2.0.0",
        "routes": [
            "/api/health",
            "/api/dashboard/overview",
            "/api/leads",
            "/api/v1/for-you/dashboard",
            "/webhooks/twilio/voice",
            "/tts/{token}",
        ],
    }


if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=env.PORT,
        reload=env.NODE_ENV.lower() == "development",
    )
