import numpy as np
from ultralytics import YOLO
from pathlib import Path

MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "yolov8_plate.pt"

_model = None


def get_model() -> YOLO:
    global _model
    if _model is None:
        if MODEL_PATH.exists():
            _model = YOLO(str(MODEL_PATH))
        else:
            # Auto-download jika belum ada (fallback saat development)
            from scripts.download_model import download
            download()
            _model = YOLO(str(MODEL_PATH))
    return _model


def detect_plates(frame: np.ndarray, conf_threshold: float = 0.45) -> list[dict]:
    model = get_model()
    results = model(frame, verbose=False, conf=conf_threshold)[0]
    detections = []

    for box in results.boxes:
        conf = float(box.conf[0])
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

        # Abaikan crop yang terlalu kecil (bukan plat valid)
        w, h = x2 - x1, y2 - y1
        if w < 30 or h < 10:
            continue

        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            continue

        detections.append({
            "bbox": (x1, y1, x2, y2),
            "confidence": conf,
            "crop": crop,
        })

    return detections
