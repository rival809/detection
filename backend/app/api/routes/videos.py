import uuid
import magic
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Query
from sqlalchemy.orm import Session
from loguru import logger

from app.db.session import get_db
from app.db.models import User, Video, VideoStatus
from app.db.schemas import VideoOut, VideoListOut
from app.api.deps import get_current_user
from app.services.storage import storage_service
from app.core.config import settings
from app.core.limiter import limiter
from app.tasks.process_video import process_video

router = APIRouter(prefix="/videos", tags=["videos"])

ALLOWED_MIME_TYPES = {"video/mp4", "video/x-msvideo", "video/quicktime"}


@router.post("/upload", response_model=VideoOut, status_code=201)
@limiter.limit(settings.UPLOAD_RATE_LIMIT)
async def upload_video(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()

    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit")

    mime = magic.from_buffer(content[:2048], mime=True)
    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=415, detail="Only MP4, AVI, MOV files are allowed")

    video_id = uuid.uuid4()
    storage_path = f"videos/{video_id}/{file.filename}"
    await storage_service.upload_bytes(content, storage_path)

    video = Video(
        id=video_id,
        user_id=current_user.id,
        original_filename=file.filename,
        storage_path=storage_path,
        status=VideoStatus.PENDING,
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    process_video.delay(str(video_id))
    logger.info(f"Video {video_id} queued for processing by user {current_user.email}")

    return video


@router.get("", response_model=VideoListOut)
def list_videos(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: VideoStatus = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Video).filter(Video.user_id == current_user.id)
    if status:
        query = query.filter(Video.status == status)
    total = query.count()
    items = query.order_by(Video.uploaded_at.desc()).offset((page - 1) * size).limit(size).all()
    return VideoListOut(items=items, total=total, page=page, size=size)


@router.get("/{video_id}", response_model=VideoOut)
def get_video(
    video_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video
