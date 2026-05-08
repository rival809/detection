import re
import numpy as np
from paddleocr import PaddleOCR

_ocr = None


def get_ocr() -> PaddleOCR:
    global _ocr
    if _ocr is None:
        _ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    return _ocr


def normalize_plate(text: str) -> str:
    text = text.upper().strip()
    text = re.sub(r"[^A-Z0-9]", "", text)
    return text


def read_plate(image: np.ndarray) -> dict:
    ocr = get_ocr()
    result = ocr.ocr(image, cls=True)

    if not result or not result[0]:
        return {"text": "", "confidence": 0.0}

    best_text = ""
    best_conf = 0.0
    for line in result[0]:
        text, conf = line[1]
        if conf > best_conf:
            best_conf = conf
            best_text = text

    return {"text": normalize_plate(best_text), "confidence": float(best_conf)}
