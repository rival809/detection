import pytest
from app.services.deduplicator import deduplicate, levenshtein


class TestLevenshtein:
    def test_identical(self):
        assert levenshtein("B1234CD", "B1234CD") == 0

    def test_one_char_diff(self):
        assert levenshtein("B1234CD", "B1234CE") == 1

    def test_completely_different(self):
        assert levenshtein("AAAA", "BBBB") == 4

    def test_empty_string(self):
        assert levenshtein("", "ABC") == 3

    def test_ocr_common_error(self):
        # O vs 0 is common OCR mistake
        assert levenshtein("B1234CD", "B1234C0") == 1


class TestDeduplicate:
    def test_empty(self):
        assert deduplicate([]) == []

    def test_single(self):
        det = [{"plate_number": "B1234CD", "confidence": 0.9}]
        assert deduplicate(det) == det

    def test_exact_duplicates_keeps_highest_confidence(self):
        dets = [
            {"plate_number": "B1234CD", "confidence": 0.7},
            {"plate_number": "B1234CD", "confidence": 0.95},
            {"plate_number": "B1234CD", "confidence": 0.6},
        ]
        result = deduplicate(dets)
        assert len(result) == 1
        assert result[0]["confidence"] == 0.95

    def test_similar_plates_merged(self):
        # OCR error: 0 vs O
        dets = [
            {"plate_number": "B1234CD", "confidence": 0.9},
            {"plate_number": "B1234C0", "confidence": 0.6},
        ]
        result = deduplicate(dets)
        assert len(result) == 1
        assert result[0]["plate_number"] == "B1234CD"

    def test_distinct_plates_kept_separate(self):
        dets = [
            {"plate_number": "B1234CD", "confidence": 0.9},
            {"plate_number": "D5678XY", "confidence": 0.85},
            {"plate_number": "F9999ZZ", "confidence": 0.75},
        ]
        result = deduplicate(dets)
        assert len(result) == 3

    def test_preserves_all_fields(self):
        dets = [{"plate_number": "B1234CD", "confidence": 0.9, "image_crop_url": "http://example.com/crop.jpg"}]
        result = deduplicate(dets)
        assert result[0]["image_crop_url"] == "http://example.com/crop.jpg"
