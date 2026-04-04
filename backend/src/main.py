from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

import socketio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from src.config.env import env
from src.middleware.error_handler import ErrorHandlerMiddleware
from src.middleware.rate_limiter import RateLimiterMiddleware
from src.routes.twilio_webhook import router as twilio_router
# from src.routes.dashboard import router as dashboard_router
from src.routes.leads import router as leads_router
from src.routes.sessions import router as sessions_router
from src.routes.health import router as health_router
from src.routes.voice_agent import router as voice_agent_router
from src.routes.for_you import router as for_you_router
from src.services.stt.sarvam import close_stt_http_client
from src.services.transcription.live_stream import set_sio
from src.cron.exchange_rates import refresh_rates
from src.cron.visa_fees import seed_visa_data
from src.cron.kb_gap_researcher import research_kb_gaps
from src.cron.drift_detector import detect_drift
from src.services.voice_agent.sentiment import get_sentiment_analyzer
from src.utils.logger import logger

# ─── APScheduler ─────────────────────────────────────────
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

scheduler = AsyncIOScheduler()


# ─── Socket.IO ───────────────────────────────────────────
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=env.FRONTEND_URL,
)


@sio.event
async def connect(sid, environ, auth=None):
    logger.info(f"Dashboard client connected | sid={sid}")


@sio.on("subscribe:session")
async def subscribe_session(sid, session_id):
    sio.enter_room(sid, f"session:{session_id}")
    logger.info(f"Dashboard subscribed to session | session={session_id}")


@sio.on("unsubscribe:session")
async def unsubscribe_session(sid, session_id):
    sio.leave_room(sid, f"session:{session_id}")


@sio.event
async def disconnect(sid):
    logger.debug(f"Dashboard client disconnected | sid={sid}")


# Share sio with broadcast functions
set_sio(sio)


def _validate_public_url_on_startup() -> None:
    issues = env.public_url_issues()
    if not issues:
        logger.info(f"PUBLIC_URL validation passed | url={env.normalized_public_url()}")
        return

    detail = "; ".join(issues)
    if env.should_fail_fast_public_url():
        logger.error(f"PUBLIC_URL validation failed | {detail}")
        raise RuntimeError(f"PUBLIC_URL validation failed: {detail}")

    logger.warning(
        f"PUBLIC_URL validation warning | {detail}. "
        f"Twilio callbacks may fail outside local development."
    )


# ─── FastAPI Lifespan ────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    _validate_public_url_on_startup()

    logger.info("Starting background cron jobs...")

    # Run once on startup
    asyncio.create_task(refresh_rates())
    asyncio.create_task(seed_visa_data())

    # Warm up sentiment analyzer models (fire-and-forget)
    analyzer = get_sentiment_analyzer()
    asyncio.create_task(analyzer.warm_up())

    # Schedule recurring jobs
    scheduler.add_job(refresh_rates, IntervalTrigger(hours=6), id="exchange_rates")
    scheduler.add_job(seed_visa_data, CronTrigger(day_of_week="mon", hour=9), id="visa_fees")
    scheduler.add_job(research_kb_gaps, IntervalTrigger(minutes=30), id="kb_gap_researcher")
    scheduler.add_job(detect_drift, CronTrigger(day_of_week="mon", hour=10), id="drift_detector")
    scheduler.start()

    logger.info(f"🎓 Fateh Backend running on http://localhost:{env.PORT}")
    logger.info(f"📞 Twilio webhook: POST {env.PUBLIC_URL}/webhooks/twilio/voice")
    logger.info(f"📞 Twilio webhook (legacy): POST {env.PUBLIC_URL}/api/twilio/voice")
    logger.info(f"🔌 Socket.IO ready for dashboard connections")
    logger.info(f"💊 Health: GET http://localhost:{env.PORT}/api/health")

    yield

    # Shutdown
    await close_stt_http_client()
    scheduler.shutdown(wait=False)
    logger.info("Scheduler shut down")


# ─── FastAPI App ─────────────────────────────────────────
app = FastAPI(
    title="Fateh Education Voice Backend",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# ─── Middleware ───────────────────────────────────────────
app.add_middleware(ErrorHandlerMiddleware)
app.add_middleware(RateLimiterMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[env.FRONTEND_URL],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Exception Handlers ────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """Log detailed validation errors for debugging"""
    logger.error(f"[VALIDATION_ERROR] Path: {request.url.path}")
    logger.error(f"[VALIDATION_ERROR] Method: {request.method}")
    logger.error(f"[VALIDATION_ERROR] Errors: {exc.errors()}")
    for error in exc.errors():
        logger.error(f"[VALIDATION_ERROR] Field: {error['loc']}, Type: {error['type']}, Message: {error['msg']}")

    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "message": "Validation failed - check logs for details"
        }
    )


# ─── Routes ──────────────────────────────────────────────
app.include_router(twilio_router, prefix="/webhooks/twilio")
app.include_router(twilio_router, prefix="/api/twilio", include_in_schema=False)
# app.include_router(dashboard_router)
app.include_router(leads_router)
app.include_router(sessions_router)
app.include_router(health_router)
app.include_router(voice_agent_router)
app.include_router(for_you_router)


@app.get("/api/dashboard/overview")
async def dashboard_overview():
    """Placeholder for missing dashboard/overview endpoint."""
    return {
        "summary": {
            "total_calls": 0,
            "leads_captured": 0,
            "hot_leads": 0,
            "avg_call_duration": 0
        },
        "recent_activity": []
    }


@app.get("/")
async def root():
    return {
        "service": "fateh-voice-backend",
        "status": "running",
        "version": "1.0.0",
        "endpoints": ["/api/health", "/webhooks/twilio/voice", "/api/dashboard/overview"],
    }


# ─── Mount Socket.IO ─────────────────────────────────────
combined_app = socketio.ASGIApp(sio, other_asgi_app=app)


if __name__ == "__main__":
    uvicorn.run(
        "src.main:combined_app",
        host="0.0.0.0",
        port=env.PORT,
        reload=env.NODE_ENV == "development",
        limit_max_requests=1000,
        limit_concurrency=100,
    )
