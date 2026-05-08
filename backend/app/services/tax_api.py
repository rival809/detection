import asyncio
import re
from datetime import datetime

import httpx

TAX_API_URL = "https://apisakti.bapenda.jabarprov.go.id/api/utilities/info-pajak"
# Fallback token used when DB has no configured token yet
_FALLBACK_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vMTkyLjE2OC45OS40Nzo4MDAwL2FwaS9sb2dpbiIsImlhdCI6MTc3ODIzNjg4MSwiZXhwIjoxNzc4MjU4NDgxLCJuYmYiOjE3NzgyMzY4ODEsImp0aSI6ImVjZ0tkNXZyYTBoWkk0S20iLCJzdWIiOiIxMSIsInBydiI6IjIzYmQ1Yzg5NDlmNjAwYWRiMzllNzAxYzQwMDg3MmRiN2E1OTc2ZjcifQ.JBV8mTUbEO0oFT5DRyx0owL5iGSy_Ac34eSNvhKU940"

_PLATE_RE = re.compile(r"^([A-Z]{1,2})(\d{1,4})([A-Z]{1,3})?$")


def get_tax_token(db=None) -> str:
    """Read token from DB system_config, fall back to hardcoded token."""
    if db is not None:
        try:
            from app.db.models import SystemConfig
            row = db.query(SystemConfig).filter(SystemConfig.key == "TAX_API_TOKEN").first()
            if row and row.value:
                return row.value
        except Exception:
            pass
    return _FALLBACK_TOKEN


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
    if not data:
        return "NOT_FOUND"

    items = data.get("data") or data.get("items") or data.get("result")
    if not items:
        return "NOT_FOUND"

    item = items[0] if isinstance(items, list) else items
    if not item:
        return "NOT_FOUND"

    # Primary: use tg_akhir_pajak date field against current server time
    tgl = (
        item.get("tg_akhir_pajak")
        or item.get("tgl_akhir_pajak")
        or item.get("masa_berlaku")
        or ""
    )
    if tgl:
        try:
            exp = datetime.strptime(str(tgl)[:10], "%Y-%m-%d")
            now = datetime.now()
            return "ACTIVE" if exp >= now else "EXPIRED"
        except ValueError:
            pass

    # Fallback: text-based status field
    status_str = str(
        item.get("status_pembayaran") or item.get("status_pajak") or item.get("status") or ""
    ).upper()

    if "BELUM" in status_str or "MATI" in status_str or "EXPIRED" in status_str:
        return "EXPIRED"
    if "LUNAS" in status_str or "AKTIF" in status_str or "PAID" in status_str:
        return "ACTIVE"

    return "NOT_FOUND"


class TaxAPIService:
    async def check_tax(self, plate_number: str, db=None) -> dict:
        parsed = parse_plate(plate_number)
        if not parsed:
            return {"status": "NOT_FOUND", "data": {"error": f"Format plat tidak dikenali: {plate_number}"}}

        token = get_tax_token(db)
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "*/*",
            "Origin": "https://dev-sakti-mobile.vercel.app",
            "Referer": "https://dev-sakti-mobile.vercel.app/",
            "User-Agent": "Mozilla/5.0",
        }

        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        TAX_API_URL,
                        json={"where": [
                            ["objek_pajak_no_polisi1", "=", parsed["objek_pajak_no_polisi1"]],
                            ["objek_pajak_no_polisi2", "=", parsed["objek_pajak_no_polisi2"]],
                            ["objek_pajak_no_polisi3", "=", parsed["objek_pajak_no_polisi3"]],
                            ["objek_pajak_kd_plat", "=", parsed["objek_pajak_kd_plat"]],
                        ], "bayar_kedepan": "T"},
                        headers=headers,
                    )

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
