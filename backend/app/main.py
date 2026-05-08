from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, videos, detections, ws
from app.db.session import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="License Plate Detection API", version="1.0.0")

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
app.include_router(ws.router)


@app.get("/health")
def health():
    return {"status": "ok"}
