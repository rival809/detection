from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str

    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET: str = "detection-storage"

    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    TAX_API_BASE_URL: str = ""
    TAX_API_KEY: str = ""

    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    MAX_UPLOAD_SIZE_MB: int = 500
    FRAME_SAMPLE_INTERVAL_SEC: float = 0.5
    BLUR_THRESHOLD: float = 100.0

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
