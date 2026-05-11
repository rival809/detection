from contextlib import asynccontextmanager
from pathlib import Path

import redis as redis_lib
from alembic import command
from alembic.config import Config
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from minio import Minio
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text

from app.api.routes import auth, detections, review, stats, videos, ws
from app.core.config import settings
from app.core.limiter import limiter
from app.core.logging import setup_logging
from app.core.middleware import RequestIDMiddleware
from app.db.session import SessionLocal


def run_migrations():
    logger.info("Running database migrations...")
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")
    logger.info("Migrations complete.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    Path("logs").mkdir(exist_ok=True)
    run_migrations()
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="License Plate Detection API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    lambda req, exc: JSONResponse({"detail": f"Rate limit exceeded: {exc.detail}"}, status_code=429),
)
app.add_middleware(SlowAPIMiddleware)

# Request ID + logging
app.add_middleware(RequestIDMiddleware)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(videos.router, prefix="/api/v1")
app.include_router(detections.router, prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")
app.include_router(review.router, prefix="/api/v1")
app.include_router(ws.router)


@app.get("/health", tags=["system"])
async def health(request: Request):
    checks: dict = {}

    # Database
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"

    # Redis
    try:
        r = redis_lib.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        r.ping()
        r.close()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"

    # MinIO
    try:
        client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=False,
        )
        client.list_buckets()
        checks["minio"] = "ok"
    except Exception as e:
        checks["minio"] = f"error: {e}"

    all_ok = all(v == "ok" for v in checks.values())
    status_code = 200 if all_ok else 503
    return JSONResponse({"status": "ok" if all_ok else "degraded", "checks": checks}, status_code=status_code)
