"""
Download pre-trained license plate detection model from HuggingFace.
Model: keremberke/yolov8n-license-plate-detection
Run once during Docker build or manually.
"""
import sys
from pathlib import Path

MODEL_DIR = Path(__file__).parent.parent / "models"
MODEL_PATH = MODEL_DIR / "yolov8_plate.pt"


def download():
    MODEL_DIR.mkdir(exist_ok=True)

    if MODEL_PATH.exists():
        print(f"Model already exists at {MODEL_PATH}, skipping download.")
        return

    print("Downloading license plate detection model from HuggingFace...")
    try:
        from huggingface_hub import hf_hub_download
        path = hf_hub_download(
            repo_id="keremberke/yolov8n-license-plate-detection",
            filename="best.pt",
            local_dir=str(MODEL_DIR),
        )
        Path(path).rename(MODEL_PATH)
        print(f"Model saved to {MODEL_PATH}")
    except Exception as e:
        print(f"HuggingFace download failed: {e}")
        print("Falling back to ultralytics hub...")
        try:
            from ultralytics import YOLO
            model = YOLO("keremberke/yolov8n-license-plate-detection")
            model.save(str(MODEL_PATH))
            print(f"Model saved to {MODEL_PATH}")
        except Exception as e2:
            print(f"All download methods failed: {e2}")
            sys.exit(1)


if __name__ == "__main__":
    download()
