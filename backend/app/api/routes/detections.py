import uuid

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models import Detection, LabeledSample, ReviewQueue, ReviewQueueStatus, TaxStatus, User, Video
from app.db.schemas import DetectionListOut, DetectionOut, LabeledSampleOut
from app.db.session import get_db
from app.services.confusion_map import invalidate_cache
from app.services.tax_api import tax_api_service

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


@router.post("/{detection_id}/correct", response_model=LabeledSampleOut)
def correct_detection(
    video_id: uuid.UUID,
    detection_id: uuid.UUID,
    corrected_plate: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Koreksi plat nomor yang salah langsung dari tabel deteksi.
    Membuat ReviewQueue (CORRECTED) + LabeledSample untuk melatih confusion map.
    """
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    detection = db.query(Detection).filter(Detection.id == detection_id, Detection.video_id == video_id).first()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")

    corrected_plate = corrected_plate.strip().upper()
    if not corrected_plate:
        raise HTTPException(status_code=422, detail="corrected_plate tidak boleh kosong")

    rq = ReviewQueue(
        video_id=video_id,
        raw_plate=detection.plate_number,
        confidence=detection.confidence,
        image_crop_url=detection.image_crop_url,
        status=ReviewQueueStatus.CORRECTED,
    )
    db.add(rq)
    db.flush()

    sample = LabeledSample(
        review_queue_id=rq.id,
        original_plate=detection.plate_number,
        corrected_plate=corrected_plate,
        reviewed_by=current_user.id,
        image_crop_url=detection.image_crop_url,
    )
    db.add(sample)

    # Update plate_number di detection dan re-check pajak
    detection.plate_number = corrected_plate
    db.commit()

    invalidate_cache()
    return sample


@router.delete("/{detection_id}", status_code=204)
def delete_detection(
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
    db.delete(detection)
    db.commit()
