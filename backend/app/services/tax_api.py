import asyncio
import re

import httpx

TAX_API_URL = "https://apisakti.bapenda.jabarprov.go.id/api/utilities/info-pajak"
TAX_API_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vMTkyLjE2OC45OS40Nzo4MDAwL2FwaS9sb2dpbiIsImlhdCI6MTc3ODIzNjg4MSwiZXhwIjoxNzc4MjU4NDgxLCJuYmYiOjE3NzgyMzY4ODEsImp0aSI6ImVjZ0tkNXZyYTBoWkk0S20iLCJzdWIiOiIxMSIsInBydiI6IjIzYmQ1Yzg5NDlmNjAwYWRiMzllNzAxYzQwMDg3MmRiN2E1OTc2ZjcifQ.JBV8mTUbEO0oFT5DRyx0owL5iGSy_Ac34eSNvhKU940"

# Plate format: [prefix letters][digits][suffix letters]
# e.g. D1469MF, B1234CD, AB1234XY
_PLATE_RE = re.compile(r"^([A-Z]{1,2})(\d{1,4})([A-Z]{1,3})?$")


def parse_plate(plate_number: str) -> dict | None:
    m = _PLATE_RE.match(plate_number.upper().strip())
    if not m:
        return None
    return {
        "objek_pajak_no_polisi1": m.group(1),
        "objek_pajak_no_polisi2": m.group(2),
        "objek_pajak_no_polisi3": m.group(3) or "",
        "objek_pajak_kd_plat": "1",
    }


def map_status(data: dict) -> str:
    """Map API response to our TaxStatus enum."""
    if not data:
        return "NOT_FOUND"

    # Try common response fields from Bapenda API
    items = data.get("data") or data.get("items") or data.get("result")

    if not items:
        return "NOT_FOUND"

    if isinstance(items, list):
        if len(items) == 0:
            return "NOT_FOUND"
        item = items[0]
    else:
        item = items

    # Check status pajak field
    status_field = (
        item.get("status_pembayaran")
        or item.get("status_pajak")
        or item.get("status")
        or ""
    )
    status_str = str(status_field).upper()

    if "BELUM" in status_str or "MATI" in status_str or "EXPIRED" in status_str:
        return "EXPIRED"
    if "LUNAS" in status_str or "AKTIF" in status_str or "PAID" in status_str:
        return "ACTIVE"

    # Fallback: check tgl_akhir_pajak (expiry date)
    tgl = item.get("tgl_akhir_pajak") or item.get("masa_berlaku") or ""
    if tgl:
        from datetime import datetime
        try:
            exp = datetime.strptime(str(tgl)[:10], "%Y-%m-%d")
            return "ACTIVE" if exp >= datetime.utcnow() else "EXPIRED"
        except ValueError:
            pass

    return "ACTIVE"


class TaxAPIService:
    async def check_tax(self, plate_number: str) -> dict:
        parsed = parse_plate(plate_number)
        if not parsed:
            return {"status": "NOT_FOUND", "data": {"error": f"Format plat tidak dikenali: {plate_number}"}}

        headers = {
            "Authorization": f"Bearer {TAX_API_TOKEN}",
            "Content-Type": "application/json",
            "Accept": "*/*",
            "Origin": "https://dev-sakti-mobile.vercel.app",
            "Referer": "https://dev-sakti-mobile.vercel.app/",
            "User-Agent": "Mozilla/5.0",
        }

        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(TAX_API_URL, json={"where": [
                        ["objek_pajak_no_polisi1", "=", parsed["objek_pajak_no_polisi1"]],
                        ["objek_pajak_no_polisi2", "=", parsed["objek_pajak_no_polisi2"]],
                        ["objek_pajak_no_polisi3", "=", parsed["objek_pajak_no_polisi3"]],
                        ["objek_pajak_kd_plat", "=", parsed["objek_pajak_kd_plat"]],
                    ], "bayar_kedepan": "T"}, headers=headers)

                    if response.status_code == 404:
                        return {"status": "NOT_FOUND", "data": None}

                    response.raise_for_status()
                    data = response.json()
                    status = map_status(data)
                    return {"status": status, "data": data}

            except httpx.HTTPStatusError as e:
                if attempt == 2:
                    return {"status": "ERROR", "data": {"error": str(e), "response": e.response.text[:500]}}
            except Exception as e:
                if attempt == 2:
                    return {"status": "ERROR", "data": {"error": str(e)}}
                await asyncio.sleep(2 ** attempt)

        return {"status": "ERROR", "data": None}


tax_api_service = TaxAPIService()
