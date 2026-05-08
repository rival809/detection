import re

import numpy as np
from fast_alpr import ALPR

_alpr: ALPR | None = None

_NORMALIZE_RE = re.compile(r"[^A-Z0-9]")

# Format plat Indonesia: 1 huruf + 1-4 angka + 0-3 huruf
# Contoh: B1234CD, D1469MF, A1B (tidak valid), 1234AB (tidak valid)
_PLATE_FORMAT_RE = re.compile(r"^[A-Z]\d{1,4}[A-Z]{0,3}$")

MIN_CONFIDENCE = 0.70


def get_alpr() -> ALPR:
    global _alpr
    if _alpr is None:
        _alpr = ALPR(
            detector_model="yolo-v9-t-384-license-plate-end2end",
            ocr_model="cct-xs-v2-global-model",
        )
    return _alpr


def normalize_plate(text: str) -> str:
    return _NORMALIZE_RE.sub("", text.upper().strip())


def is_valid_plate(text: str) -> bool:
    return bool(_PLATE_FORMAT_RE.match(text))


def detect_and_read(frame: np.ndarray) -> list[dict]:
    """
    Run plate detection + OCR on a single frame.
    Returns list of { plate_number, confidence, crop }.
    Only returns plates with valid Indonesian format and confidence >= 70%.
    """
    alpr = get_alpr()
    results = alpr.predict(frame)

    detections = []
    for plate in results:
        ocr = plate.ocr
        if not ocr or not ocr.text:
            continue

        text = normalize_plate(ocr.text)

        if not is_valid_plate(text):
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
        raw_ocr_conf = ocr.confidence
        ocr_conf = float(sum(raw_ocr_conf) / len(raw_ocr_conf)) if isinstance(raw_ocr_conf, list) else float(raw_ocr_conf)
        confidence = (det_conf * ocr_conf) ** 0.5

        if confidence < MIN_CONFIDENCE:
            continue

        detections.append({
            "plate_number": text,
            "confidence": confidence,
            "crop": crop,
        })

    return detections
