import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User, Video, Detection
from app.db.schemas import DetectionOut, DetectionListOut
from app.api.deps import get_current_user
from app.services.tax_api import tax_api_service
from app.db.models import TaxStatus

router = APIRouter(prefix="/videos/{video_id}/detections", tags=["detections"])


@router.get("", response_model=DetectionListOut)
def list_detections(
    video_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    items = db.query(Detection).filter(Detection.video_id == video_id).all()
    return DetectionListOut(items=items, total=len(items))


@router.post("/{detection_id}/recheck", response_model=DetectionOut)
async def recheck_tax(
    video_id: uuid.UUID,
    detection_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    detection = db.query(Detection).filter(Detection.id == detection_id, Detection.video_id == video_id).first()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")

    result = await tax_api_service.check_tax(detection.plate_number)
    detection.tax_info_json = result.get("data")
    detection.tax_status = TaxStatus(result.get("status", "ERROR"))
    db.commit()
    db.refresh(detection)
    return detection
