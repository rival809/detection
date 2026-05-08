from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.db.session import get_db
from app.db.models import User, Video, Detection, VideoStatus, TaxStatus
from app.api.deps import get_current_user
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta

router = APIRouter(prefix="/stats", tags=["stats"])


class DashboardStats(BaseModel):
    total_videos: int
    processing_videos: int
    total_plates: int
    active_tax: int
    expired_tax: int
    not_found_tax: int
    error_tax: int


class DailyCount(BaseModel):
    date: str
    count: int


class DetectionTrend(BaseModel):
    trend: List[DailyCount]


@router.get("/dashboard", response_model=DashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    video_stats = db.query(
        func.count(Video.id).label("total"),
        func.sum(case((Video.status == VideoStatus.PROCESSING, 1), else_=0)).label("processing"),
        func.coalesce(func.sum(Video.total_plates), 0).label("total_plates"),
    ).filter(Video.user_id == current_user.id).one()

    tax_stats = db.query(
        func.sum(case((Detection.tax_status == TaxStatus.ACTIVE, 1), else_=0)).label("active"),
        func.sum(case((Detection.tax_status == TaxStatus.EXPIRED, 1), else_=0)).label("expired"),
        func.sum(case((Detection.tax_status == TaxStatus.NOT_FOUND, 1), else_=0)).label("not_found"),
        func.sum(case((Detection.tax_status == TaxStatus.ERROR, 1), else_=0)).label("error"),
    ).join(Video, Detection.video_id == Video.id).filter(
        Video.user_id == current_user.id
    ).one()

    return DashboardStats(
        total_videos=video_stats.total or 0,
        processing_videos=video_stats.processing or 0,
        total_plates=video_stats.total_plates or 0,
        active_tax=tax_stats.active or 0,
        expired_tax=tax_stats.expired or 0,
        not_found_tax=tax_stats.not_found or 0,
        error_tax=tax_stats.error or 0,
    )


@router.get("/trend", response_model=DetectionTrend)
def detection_trend(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)

    rows = db.query(
        func.date(Detection.detected_at).label("date"),
        func.count(Detection.id).label("count"),
    ).join(Video, Detection.video_id == Video.id).filter(
        Video.user_id == current_user.id,
        Detection.detected_at >= since,
    ).group_by(func.date(Detection.detected_at)).order_by(func.date(Detection.detected_at)).all()

    return DetectionTrend(trend=[DailyCount(date=str(r.date), count=r.count) for r in rows])
