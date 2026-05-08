import numpy as np

from app.services.video_processor import is_sharp


class TestIsSharp:
    def _solid_frame(self, value: int = 128) -> np.ndarray:
        # Solid color = zero variance = blurry
        return np.full((100, 100, 3), value, dtype=np.uint8)

    def _sharp_frame(self) -> np.ndarray:
        # Checkerboard pattern = high laplacian variance = sharp
        frame = np.zeros((100, 100, 3), dtype=np.uint8)
        frame[::2, ::2] = 255
        return frame

    def test_solid_color_is_blurry(self):
        assert is_sharp(self._solid_frame(), threshold=100.0) is False

    def test_checkerboard_is_sharp(self):
        assert is_sharp(self._sharp_frame(), threshold=100.0) is True

    def test_custom_threshold_low(self):
        # With very low threshold, even solid frame passes
        assert is_sharp(self._solid_frame(), threshold=0.0) is True

    def test_custom_threshold_high(self):
        # With very high threshold, even checkerboard fails
        assert is_sharp(self._sharp_frame(), threshold=1e9) is False

    def test_different_frame_sizes(self):
        small = np.zeros((10, 10, 3), dtype=np.uint8)
        small[::2, ::2] = 255
        assert isinstance(is_sharp(small), bool)
