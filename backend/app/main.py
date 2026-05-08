from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from alembic.config import Config
from alembic import command

from app.core.config import settings
from app.api.routes import auth, videos, detections, ws, stats


def run_migrations():
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()
    yield


app = FastAPI(title="License Plate Detection API", version="1.0.0", lifespan=lifespan)

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
app.include_router(ws.router)


@app.get("/health")
def health():
    return {"status": "ok"}
