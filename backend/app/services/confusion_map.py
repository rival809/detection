"""
Character confusion map — belajar dari koreksi user di labeled_samples.

Cara kerja:
1. Ambil semua LabeledSample yang punya corrected_plate (user koreksi, bukan approve)
2. Align karakter original vs corrected (hanya jika panjang sama, maks 2 char berbeda)
3. Hitung frekuensi setiap substitusi: misal O→0 muncul 15x, I→1 muncul 8x
4. Simpan sebagai dict {wrong_char: correct_char} hanya untuk substitusi yang konsisten
   (correct_char menang ≥ MIN_VOTES kali DAN dominasi ≥ MIN_RATIO dari semua substitusi char itu)
5. Di-cache in-memory dengan TTL agar tidak query DB setiap deteksi
"""

import time
from collections import defaultdict

from app.db.models import LabeledSample
from app.db.session import SessionLocal

# Substitusi dianggap valid jika muncul minimal N kali
MIN_VOTES = 3
# Dan char tujuan mendominasi minimal 80% dari semua koreksi untuk char asal itu
MIN_RATIO = 0.80
# Cache TTL dalam detik (refresh tiap 10 menit)
CACHE_TTL = 600

_cache: dict[str, str] = {}
_cache_ts: float = 0.0


def _compute_confusion_map() -> dict[str, str]:
    db = SessionLocal()
    try:
        samples = (
            db.query(LabeledSample)
            .filter(LabeledSample.corrected_plate.isnot(None))
            .all()
        )
    finally:
        db.close()

    # votes[wrong_char][correct_char] = count
    votes: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for s in samples:
        orig = s.original_plate.upper()
        corr = s.corrected_plate.upper()

        # Hanya proses jika panjang sama dan max 2 karakter berbeda
        if len(orig) != len(corr):
            continue
        diffs = [(o, c) for o, c in zip(orig, corr) if o != c]
        if len(diffs) == 0 or len(diffs) > 2:
            continue

        for wrong, correct in diffs:
            votes[wrong][correct] += 1

    confusion: dict[str, str] = {}
    for wrong_char, corrections in votes.items():
        total = sum(corrections.values())
        best_char, best_count = max(corrections.items(), key=lambda x: x[1])
        if best_count >= MIN_VOTES and (best_count / total) >= MIN_RATIO:
            confusion[wrong_char] = best_char

    return confusion


def get_confusion_map() -> dict[str, str]:
    global _cache, _cache_ts
    if time.time() - _cache_ts > CACHE_TTL:
        _cache = _compute_confusion_map()
        _cache_ts = time.time()
    return _cache


def invalidate_cache() -> None:
    global _cache_ts
    _cache_ts = 0.0


def apply_confusion_map(text: str) -> str:
    mapping = get_confusion_map()
    if not mapping:
        return text
    return "".join(mapping.get(ch, ch) for ch in text)
