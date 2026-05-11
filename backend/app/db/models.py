import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class VideoStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class TaxStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    NOT_FOUND = "NOT_FOUND"
    ERROR = "ERROR"


class ReviewQueueStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    CORRECTED = "CORRECTED"
    REJECTED = "REJECTED"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superadmin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    videos = relationship("Video", back_populates="user")


class Video(Base):
    __tablename__ = "videos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    original_filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    status = Column(SAEnum(VideoStatus), default=VideoStatus.PENDING, nullable=False)
    error_message = Column(Text, nullable=True)
    total_plates = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="videos")
    detections = relationship("Detection", back_populates="video")
    review_queue = relationship("ReviewQueue", back_populates="video")


class Detection(Base):
    __tablename__ = "detections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    video_id = Column(UUID(as_uuid=True), ForeignKey("videos.id"), nullable=False)
    plate_number = Column(String, nullable=False, index=True)
    confidence = Column(Float, nullable=False)
    image_crop_url = Column(String, nullable=True)
    tax_info_json = Column(JSONB, nullable=True)
    tax_status = Column(SAEnum(TaxStatus), default=TaxStatus.ERROR)
    detected_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("Video", back_populates="detections")


class ReviewQueue(Base):
    __tablename__ = "review_queue"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    video_id = Column(UUID(as_uuid=True), ForeignKey("videos.id"), nullable=False)
    raw_plate = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    image_crop_url = Column(String, nullable=True)
    status = Column(SAEnum(ReviewQueueStatus), default=ReviewQueueStatus.PENDING, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("Video")
    labeled_sample = relationship("LabeledSample", back_populates="review_item", uselist=False)


class LabeledSample(Base):
    __tablename__ = "labeled_samples"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_queue_id = Column(UUID(as_uuid=True), ForeignKey("review_queue.id"), nullable=False)
    original_plate = Column(String, nullable=False)
    corrected_plate = Column(String, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    reviewed_at = Column(DateTime, default=datetime.utcnow)
    image_crop_url = Column(String, nullable=True)

    review_item = relationship("ReviewQueue", back_populates="labeled_sample")
