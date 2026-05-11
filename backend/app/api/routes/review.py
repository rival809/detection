import csv
import io
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models import LabeledSample, ReviewQueue, ReviewQueueStatus, User
from app.db.schemas import CorrectPlateIn, LabeledSampleOut, ReviewQueueListOut, ReviewQueueOut
from app.db.session import get_db
from app.services.confusion_map import get_confusion_map, invalidate_cache

router = APIRouter(prefix="/review", tags=["review"])


@router.get("/queue", response_model=ReviewQueueListOut)
def list_review_queue(
    page: int = 1,
    size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    offset = (page - 1) * size
    query = db.query(ReviewQueue).filter(ReviewQueue.status == ReviewQueueStatus.PENDING)
    total = query.count()
    items = query.order_by(ReviewQueue.created_at.desc()).offset(offset).limit(size).all()
    return ReviewQueueListOut(items=items, total=total, page=page, size=size)


@router.post("/queue/{item_id}/approve", response_model=LabeledSampleOut)
def approve_review(
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ReviewQueue).filter(ReviewQueue.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Review item not found")
    if item.status != ReviewQueueStatus.PENDING:
        raise HTTPException(status_code=400, detail="Item already reviewed")

    item.status = ReviewQueueStatus.APPROVED
    sample = LabeledSample(
        review_queue_id=item.id,
        original_plate=item.raw_plate,
        corrected_plate=None,
        reviewed_by=current_user.id,
        image_crop_url=item.image_crop_url,
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)
    return sample


@router.post("/queue/{item_id}/correct", response_model=LabeledSampleOut)
def correct_review(
    item_id: uuid.UUID,
    body: CorrectPlateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ReviewQueue).filter(ReviewQueue.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Review item not found")
    if item.status != ReviewQueueStatus.PENDING:
        raise HTTPException(status_code=400, detail="Item already reviewed")

    item.status = ReviewQueueStatus.CORRECTED
    sample = LabeledSample(
        review_queue_id=item.id,
        original_plate=item.raw_plate,
        corrected_plate=body.corrected_plate,
        reviewed_by=current_user.id,
        image_crop_url=item.image_crop_url,
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)
    invalidate_cache()
    return sample


@router.post("/queue/{item_id}/reject", status_code=204)
def reject_review(
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ReviewQueue).filter(ReviewQueue.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Review item not found")
    if item.status != ReviewQueueStatus.PENDING:
        raise HTTPException(status_code=400, detail="Item already reviewed")

    item.status = ReviewQueueStatus.REJECTED
    db.commit()


@router.get("/queue/pending-count")
def pending_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = db.query(ReviewQueue).filter(ReviewQueue.status == ReviewQueueStatus.PENDING).count()
    return {"count": count}


@router.get("/confusion-map")
def inspect_confusion_map(
    current_user: User = Depends(get_current_user),
):
    """Lihat confusion map yang sedang aktif dipakai oleh ALPR engine."""
    mapping = get_confusion_map()
    return {
        "total_rules": len(mapping),
        "rules": [{"wrong": k, "correct": v} for k, v in sorted(mapping.items())],
    }


@router.get("/export")
def export_labeled_dataset(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    samples = db.query(LabeledSample).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "original_plate", "corrected_plate", "image_crop_url", "reviewed_at"])
    for s in samples:
        writer.writerow([
            str(s.id),
            s.original_plate,
            s.corrected_plate or s.original_plate,
            s.image_crop_url or "",
            s.reviewed_at.isoformat(),
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=labeled_dataset.csv"},
    )
