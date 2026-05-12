"""
Structured logging configuration with request ID middleware.
"""

import logging
import uuid
import time
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")


class RequestIDFilter(logging.Filter):
    """Inject request_id into every log record."""
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get("-")  # type: ignore[attr-defined]
        return True


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Attach a unique request ID, log request timing, and trace errors."""

    async def dispatch(self, request: Request, call_next) -> Response:
        rid = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
        request_id_var.set(rid)

        logger = logging.getLogger("openbench.request")
        start = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            elapsed = (time.perf_counter() - start) * 1000
            logger.exception(
                "[%s] %s %s FAILED after %.0fms",
                rid, request.method, request.url.path, elapsed,
            )
            raise

        elapsed = (time.perf_counter() - start) * 1000
        logger.info(
            "[%s] %s %s → %d (%.0fms)",
            rid, request.method, request.url.path, response.status_code, elapsed,
        )
        response.headers["X-Request-ID"] = rid
        return response


def setup_logging(level: str = "INFO") -> None:
    """Configure root logger with structured format and request ID filter."""
    fmt = "%(levelname)-5s  %(request_id)s  %(name)s  %(message)s"
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(fmt))
    handler.addFilter(RequestIDFilter())

    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    root.handlers.clear()
    root.addHandler(handler)
