import numpy as np
import cv2
from ultralytics import YOLO
from pathlib import Path

MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "yolov8_plate.pt"

_model = None


def get_model() -> YOLO:
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            # Fallback: download base YOLOv8n if custom model not present
            _model = YOLO("yolov8n.pt")
        else:
            _model = YOLO(str(MODEL_PATH))
    return _model


def detect_plates(frame: np.ndarray) -> list[dict]:
    model = get_model()
    results = model(frame, verbose=False)[0]
    detections = []

    for box in results.boxes:
        conf = float(box.conf[0])
        if conf < 0.4:
            continue
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        crop = frame[y1:y2, x1:x2]
        detections.append({
            "bbox": (x1, y1, x2, y2),
            "confidence": conf,
            "crop": crop,
        })

    return detections
