"""
Download license plate detection model.
Priority:
  1. Custom model at models/yolov8_plate.pt (operator-supplied)
  2. Fallback: yolov8n.pt (general detector — works but less accurate on plates)

To use a custom plate detection model:
  Place your .pt file at backend/models/yolov8_plate.pt before building.
"""
from pathlib import Path
from ultralytics import YOLO

MODEL_DIR = Path(__file__).parent.parent / "models"
MODEL_PATH = MODEL_DIR / "yolov8_plate.pt"


def download():
    MODEL_DIR.mkdir(exist_ok=True)

    if MODEL_PATH.exists():
        print(f"[model] Custom model found at {MODEL_PATH} — skipping download.")
        return

    print("[model] No custom model found. Downloading yolov8n.pt as fallback...")
    print("[model] NOTE: yolov8n.pt is a general detector.")
    print("[model] For better plate accuracy, place a custom model at models/yolov8_plate.pt")

    try:
        model = YOLO("yolov8n.pt")
        model.save(str(MODEL_PATH))
        print(f"[model] Fallback model saved to {MODEL_PATH}")
    except Exception as e:
        print(f"[model] WARNING: Could not download fallback model: {e}")
        print("[model] YOLO will auto-download on first inference.")


if __name__ == "__main__":
    download()
