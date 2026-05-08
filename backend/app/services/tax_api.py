import asyncio
import httpx
from app.core.config import settings


class TaxAPIService:
    async def check_tax(self, plate_number: str) -> dict:
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.get(
                        f"{settings.TAX_API_BASE_URL}/check",
                        params={"plate": plate_number},
                        headers={"Authorization": f"Bearer {settings.TAX_API_KEY}"},
                    )
                    response.raise_for_status()
                    data = response.json()
                    status = "ACTIVE" if data.get("is_active") else "EXPIRED"
                    return {"status": status, "data": data}
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 404:
                    return {"status": "NOT_FOUND", "data": None}
                if attempt == 2:
                    return {"status": "ERROR", "data": {"error": str(e)}}
            except Exception as e:
                if attempt == 2:
                    return {"status": "ERROR", "data": {"error": str(e)}}
                await asyncio.sleep(2 ** attempt)

        return {"status": "ERROR", "data": None}


tax_api_service = TaxAPIService()
