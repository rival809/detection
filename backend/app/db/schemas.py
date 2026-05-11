from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.db.models import ReviewQueueStatus, TaxStatus, VideoStatus


# Auth
class UserRegister(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: UUID
    email: str
    is_active: bool
    is_superadmin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    is_superadmin: bool = False


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_superadmin: Optional[bool] = None


class UserListOut(BaseModel):
    items: List[UserOut]
    total: int


# Video
class VideoOut(BaseModel):
    id: UUID
    original_filename: str
    status: VideoStatus
    total_plates: int
    uploaded_at: datetime
    processed_at: Optional[datetime]
    error_message: Optional[str]

    class Config:
        from_attributes = True


class VideoListOut(BaseModel):
    items: List[VideoOut]
    total: int
    page: int
    size: int


# Detection
class DetectionOut(BaseModel):
    id: UUID
    plate_number: str
    confidence: float
    image_crop_url: Optional[str]
    tax_info_json: Optional[Any]
    tax_status: TaxStatus
    detected_at: datetime

    class Config:
        from_attributes = True


class DetectionListOut(BaseModel):
    items: List[DetectionOut]
    total: int


# Review Queue
class ReviewQueueOut(BaseModel):
    id: UUID
    video_id: UUID
    raw_plate: str
    confidence: float
    image_crop_url: Optional[str]
    status: ReviewQueueStatus
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewQueueListOut(BaseModel):
    items: List[ReviewQueueOut]
    total: int
    page: int
    size: int


class CorrectPlateIn(BaseModel):
    corrected_plate: str


class LabeledSampleOut(BaseModel):
    id: UUID
    review_queue_id: UUID
    original_plate: str
    corrected_plate: Optional[str]
    reviewed_at: datetime
    image_crop_url: Optional[str]

    class Config:
        from_attributes = True
