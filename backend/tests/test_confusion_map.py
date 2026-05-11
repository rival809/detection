from unittest.mock import MagicMock, patch

from app.services.confusion_map import (
    MIN_VOTES,
    _compute_confusion_map,
    apply_confusion_map,
)


def _make_sample(original: str, corrected: str | None):
    s = MagicMock()
    s.original_plate = original
    s.corrected_plate = corrected
    return s


def _patch_db(samples):
    return patch("app.db.session.SessionLocal", return_value=_mock_session(samples))


def _mock_session(samples):
    session = MagicMock()
    query = MagicMock()
    query.filter.return_value.all.return_value = samples
    session.query.return_value = query
    session.__enter__ = lambda s: s
    session.__exit__ = MagicMock(return_value=False)
    return session


class TestComputeConfusionMap:
    def test_empty_samples_returns_empty(self):
        with _patch_db([]):
            result = _compute_confusion_map()
        assert result == {}

    def test_single_substitution_below_min_votes_ignored(self):
        # O→0 hanya 1x, MIN_VOTES=3 → tidak masuk
        samples = [_make_sample("B123OD", "B1230D")]
        with _patch_db(samples):
            result = _compute_confusion_map()
        assert "O" not in result

    def test_substitution_meets_min_votes(self):
        samples = [_make_sample("B123OD", "B1230D")] * MIN_VOTES
        with _patch_db(samples):
            result = _compute_confusion_map()
        assert result.get("O") == "0"

    def test_inconsistent_substitution_ignored(self):
        # O→0 2x, O→Q 2x — tidak ada yang dominasi ≥ 80%
        samples = (
            [_make_sample("B123OD", "B1230D")] * 2 +
            [_make_sample("B123OD", "B123QD")] * 2
        )
        with _patch_db(samples):
            result = _compute_confusion_map()
        assert "O" not in result

    def test_different_length_plates_skipped(self):
        # Panjang berbeda → tidak diproses
        samples = [_make_sample("B123OD", "B12300D")] * MIN_VOTES
        with _patch_db(samples):
            result = _compute_confusion_map()
        assert result == {}

    def test_more_than_two_diffs_skipped(self):
        # "B123OI" vs "B023XD": 3 karakter berbeda (1→0, O→X, I→D) → terlalu noisy, skip
        samples = [_make_sample("B123OI", "B023XD")] * MIN_VOTES
        with _patch_db(samples):
            result = _compute_confusion_map()
        assert result == {}

    def test_multiple_rules_learned(self):
        # I→1 dan O→0 keduanya konsisten
        samples = (
            [_make_sample("B1I3CD", "B113CD")] * MIN_VOTES +
            [_make_sample("B123OD", "B1230D")] * MIN_VOTES
        )
        with _patch_db(samples):
            result = _compute_confusion_map()
        assert result.get("I") == "1"
        assert result.get("O") == "0"


class TestApplyConfusionMap:
    def test_no_rules_returns_original(self):
        with patch("app.services.confusion_map.get_confusion_map", return_value={}):
            assert apply_confusion_map("B123OD") == "B123OD"

    def test_applies_substitution(self):
        with patch("app.services.confusion_map.get_confusion_map", return_value={"O": "0"}):
            assert apply_confusion_map("B123OD") == "B1230D"

    def test_applies_multiple_rules(self):
        with patch("app.services.confusion_map.get_confusion_map", return_value={"O": "0", "I": "1"}):
            assert apply_confusion_map("BI23OD") == "B1230D"

    def test_chars_without_rule_unchanged(self):
        with patch("app.services.confusion_map.get_confusion_map", return_value={"O": "0"}):
            assert apply_confusion_map("B1234CD") == "B1234CD"
