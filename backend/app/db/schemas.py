from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID
from app.db.models import VideoStatus, TaxStatus


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
    created_at: datetime

    class Config:
        from_attributes = True


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
