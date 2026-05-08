import io
from datetime import timedelta

from minio import Minio

from app.core.config import settings


class StorageService:
    def __init__(self):
        self._client: Minio | None = None
        self._public_client: Minio | None = None

    @property
    def client(self) -> Minio:
        if self._client is None:
            self._client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=False,
            )
            self._ensure_bucket()
        return self._client

    @property
    def public_client(self) -> Minio:
        """Client pakai public URL — khusus untuk generate presigned URL yang bisa dibuka browser."""
        if self._public_client is None:
            endpoint = settings.MINIO_PUBLIC_URL.replace("http://", "").replace("https://", "") if settings.MINIO_PUBLIC_URL else settings.MINIO_ENDPOINT
            self._public_client = Minio(
                endpoint,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_PUBLIC_URL.startswith("https") if settings.MINIO_PUBLIC_URL else False,
            )
        return self._public_client

    def _ensure_bucket(self):
        if not self._client.bucket_exists(settings.MINIO_BUCKET):
            self._client.make_bucket(settings.MINIO_BUCKET)

    async def upload_bytes(self, data: bytes, object_name: str, content_type: str = "application/octet-stream"):
        self.client.put_object(
            settings.MINIO_BUCKET,
            object_name,
            io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )

    def upload_file(self, file_path: str, object_name: str, content_type: str = "application/octet-stream"):
        self.client.fput_object(settings.MINIO_BUCKET, object_name, file_path, content_type=content_type)

    def download_file(self, object_name: str, dest_path: str):
        self.client.fget_object(settings.MINIO_BUCKET, object_name, dest_path)

    def get_presigned_url(self, object_name: str, expires_hours: int = 1) -> str:
        return self.public_client.presigned_get_object(
            settings.MINIO_BUCKET,
            object_name,
            expires=timedelta(hours=expires_hours),
        )


storage_service = StorageService()
