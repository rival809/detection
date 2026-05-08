import re

import numpy as np
from fast_alpr import ALPR

_alpr: ALPR | None = None

_NORMALIZE_RE = re.compile(r"[^A-Z0-9]")


def get_alpr() -> ALPR:
    global _alpr
    if _alpr is None:
        _alpr = ALPR(
            detector_model="yolo-v9-t-384-license-plate-end2end",
            ocr_model="global-plates-mobile-vit-v2-model",
        )
    return _alpr


def normalize_plate(text: str) -> str:
    return _NORMALIZE_RE.sub("", text.upper().strip())


def detect_and_read(frame: np.ndarray) -> list[dict]:
    """
    Run plate detection + OCR on a single frame.
    Returns list of { plate_number, confidence, crop }.
    """
    alpr = get_alpr()
    results = alpr.predict(frame)

    detections = []
    for plate in results:
        ocr = plate.ocr
        if not ocr or not ocr.text:
            continue

        text = normalize_plate(ocr.text)
        if len(text) < 4:
            continue

        # Crop from bounding box
        bb = plate.detection.bounding_box
        x1, y1 = int(bb.x1), int(bb.y1)
        x2, y2 = int(bb.x2), int(bb.y2)
        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            continue

        # Combined confidence: geometric mean of detection + OCR score
        det_conf = float(plate.detection.confidence)
        ocr_conf = float(ocr.confidence)
        confidence = (det_conf * ocr_conf) ** 0.5

        detections.append({
            "plate_number": text,
            "confidence": confidence,
            "crop": crop,
        })

    return detections
