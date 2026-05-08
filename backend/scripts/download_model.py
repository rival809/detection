"""
Pre-warm fast-alpr by triggering model download at build/startup time.
Models are cached by fast-alpr automatically (typically in ~/.cache).
"""
from app.services.alpr_engine import get_alpr


def download():
    print("[alpr] Pre-loading fast-alpr models...")
    get_alpr()
    print("[alpr] Models ready.")


if __name__ == "__main__":
    download()
