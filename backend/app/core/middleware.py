import uuid
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from loguru import logger


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        start = time.perf_counter()

        with logger.contextualize(request_id=request_id):
            logger.info(f"{request.method} {request.url.path}")
            try:
                response = await call_next(request)
            except Exception as exc:
                logger.exception(f"Unhandled error: {exc}")
                raise
            elapsed = (time.perf_counter() - start) * 1000
            logger.info(f"{request.method} {request.url.path} → {response.status_code} ({elapsed:.1f}ms)")

        response.headers["X-Request-ID"] = request_id
        return response
