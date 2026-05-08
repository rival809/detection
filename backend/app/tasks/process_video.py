import asyncio
import json
import os
import tempfile
import uuid
from datetime import datetime

import cv2
import redis
from loguru import logger

from app.core.celery_app import celery_app
from app.core.config import settings
from app.db.models import Detection, TaxStatus, Video, VideoStatus
from app.db.session import SessionLocal
from app.services.deduplicator import deduplicate
from app.services.ocr_engine import read_plate
from app.services.storage import storage_service
from app.services.tax_api import TaxAPIService
from app.services.video_processor import frame_sampler
from app.services.yolo_detector import detect_plates


def publish_progress(r: redis.Redis, video_id: str, stage: str, percent: int, message: str = ""):
    payload = json.dumps({"stage": stage, "percent": percent, "message": message})
    r.publish(f"video_progress:{video_id}", payload)


@celery_app.task(bind=True, max_retries=3)
def process_video(self, video_id: str):
    db = SessionLocal()
    r = redis.from_url(settings.REDIS_URL)
    tmp_path = None

    logger.info(f"[video:{video_id}] Task started")

    try:
        video = db.query(Video).filter(Video.id == uuid.UUID(video_id)).first()
        if not video:
            logger.warning(f"[video:{video_id}] Not found in DB, skipping")
            return

        video.status = VideoStatus.PROCESSING
        db.commit()
        publish_progress(r, video_id, "started", 5, "Memulai pemrosesan video")

        # Download video
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp_path = tmp.name
        storage_service.download_file(video.storage_path, tmp_path)
        logger.info(f"[video:{video_id}] Downloaded to {tmp_path}")
        publish_progress(r, video_id, "downloaded", 15, "Video berhasil diunduh")

        # Process frames
        raw_detections = []
        for frame_idx, frame, total_frames in frame_sampler(tmp_path):
            progress = 15 + int((frame_idx / max(total_frames, 1)) * 50)
            publish_progress(r, video_id, "processing", progress, f"Memproses frame {frame_idx}")

            plates = detect_plates(frame)
            for plate_det in plates:
                crop = plate_det["crop"]
                if crop.size == 0:
                    continue
                ocr_result = read_plate(crop)
                if not ocr_result["text"] or len(ocr_result["text"]) < 4:
                    continue

                crop_filename = f"crops/{video_id}/{frame_idx}_{uuid.uuid4().hex[:8]}.jpg"
                _, buf = cv2.imencode(".jpg", crop)
                asyncio.run(storage_service.upload_bytes(buf.tobytes(), crop_filename, "image/jpeg"))
                crop_url = storage_service.get_presigned_url(crop_filename, expires_hours=24 * 7)

                raw_detections.append({
                    "plate_number": ocr_result["text"],
                    "confidence": min(plate_det["confidence"], ocr_result["confidence"]),
                    "image_crop_url": crop_url,
                })

        logger.info(f"[video:{video_id}] Raw detections: {len(raw_detections)}")
        publish_progress(r, video_id, "deduplicating", 70, "Deduplication plat nomor")
        unique_detections = deduplicate(raw_detections)
        logger.info(f"[video:{video_id}] Unique plates: {len(unique_detections)}")

        # Tax API
        tax_service = TaxAPIService()
        for i, det in enumerate(unique_detections):
            publish_progress(r, video_id, "tax_check", 70 + int((i / max(len(unique_detections), 1)) * 25), f"Cek pajak: {det['plate_number']}")
            tax_result = asyncio.run(tax_service.check_tax(det["plate_number"]))
            logger.info(f"[video:{video_id}] Plate {det['plate_number']} → tax:{tax_result['status']}")

            detection = Detection(
                video_id=uuid.UUID(video_id),
                plate_number=det["plate_number"],
                confidence=det["confidence"],
                image_crop_url=det["image_crop_url"],
                tax_info_json=tax_result.get("data"),
                tax_status=TaxStatus(tax_result.get("status", "ERROR")),
            )
            db.add(detection)

        video.status = VideoStatus.COMPLETED
        video.total_plates = len(unique_detections)
        video.processed_at = datetime.utcnow()
        db.commit()

        logger.info(f"[video:{video_id}] Completed — {len(unique_detections)} plates found")
        publish_progress(r, video_id, "completed", 100, f"Selesai! {len(unique_detections)} plat ditemukan")

    except Exception as exc:
        logger.exception(f"[video:{video_id}] Processing failed: {exc}")
        db.rollback()
        video = db.query(Video).filter(Video.id == uuid.UUID(video_id)).first()
        if video:
            video.status = VideoStatus.FAILED
            video.error_message = str(exc)
            db.commit()
        publish_progress(r, video_id, "failed", 0, str(exc))
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()
        r.close()
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
            logger.debug(f"[video:{video_id}] Temp file cleaned up")
