from app.services.tax_api import map_status, parse_plate


class TestParsePlate:
    def test_standard_format(self):
        result = parse_plate("B1234CD")
        assert result["objek_pajak_no_polisi1"] == "B"
        assert result["objek_pajak_no_polisi2"] == "1234"
        assert result["objek_pajak_no_polisi3"] == "CD"

    def test_two_letter_prefix(self):
        result = parse_plate("AB1234XY")
        assert result["objek_pajak_no_polisi1"] == "AB"
        assert result["objek_pajak_no_polisi2"] == "1234"
        assert result["objek_pajak_no_polisi3"] == "XY"

    def test_single_letter_suffix(self):
        result = parse_plate("D1469MF")
        assert result["objek_pajak_no_polisi1"] == "D"
        assert result["objek_pajak_no_polisi2"] == "1469"
        assert result["objek_pajak_no_polisi3"] == "MF"

    def test_no_suffix(self):
        result = parse_plate("B1234")
        assert result is not None
        assert result["objek_pajak_no_polisi3"] == ""

    def test_lowercase_normalized(self):
        result = parse_plate("b1234cd")
        assert result["objek_pajak_no_polisi1"] == "B"

    def test_invalid_format_returns_none(self):
        assert parse_plate("INVALID") is None
        assert parse_plate("123ABC") is None
        assert parse_plate("") is None
        assert parse_plate("B 1234 CD") is None

    def test_kd_plat_hardcoded(self):
        result = parse_plate("B1234CD")
        assert result["objek_pajak_kd_plat"] == "1"


class TestMapStatus:
    def test_empty_data_returns_not_found(self):
        assert map_status({}) == "NOT_FOUND"
        assert map_status({"data": []}) == "NOT_FOUND"
        assert map_status({"data": None}) == "NOT_FOUND"

    def test_lunas_returns_active(self):
        data = {"data": [{"status_pembayaran": "LUNAS"}]}
        assert map_status(data) == "ACTIVE"

    def test_belum_returns_expired(self):
        data = {"data": [{"status_pembayaran": "BELUM LUNAS"}]}
        assert map_status(data) == "EXPIRED"

    def test_mati_returns_expired(self):
        data = {"data": [{"status_pajak": "MATI"}]}
        assert map_status(data) == "EXPIRED"

    def test_future_date_returns_active(self):
        data = {"data": [{"tgl_akhir_pajak": "2099-12-31"}]}
        assert map_status(data) == "ACTIVE"

    def test_past_date_returns_expired(self):
        data = {"data": [{"tgl_akhir_pajak": "2020-01-01"}]}
        assert map_status(data) == "EXPIRED"
