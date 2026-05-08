from typing import Generator

import cv2
import numpy as np

from app.core.config import settings


def is_sharp(frame: np.ndarray, threshold: float = None) -> bool:
    threshold = threshold or settings.BLUR_THRESHOLD
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return bool(cv2.Laplacian(gray, cv2.CV_64F).var() >= threshold)


def frame_sampler(video_path: str, interval_sec: float = None) -> Generator:
    interval_sec = interval_sec or settings.FRAME_SAMPLE_INTERVAL_SEC
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_interval = max(1, int(fps * interval_sec))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    frame_idx = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_interval == 0:
            if is_sharp(frame):
                yield frame_idx, frame, total_frames
        frame_idx += 1

    cap.release()
