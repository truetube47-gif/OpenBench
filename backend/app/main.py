from contextlib import asynccontextmanager
import asyncio
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import init_db
from app.core.cache import cache_stats, cleanup_expired
from app.core.logging_config import setup_logging, RequestLoggingMiddleware
from app.routers import analyze, compare, leaderboard, models, share, community, hardware_check

# ── Structured logging ───────────────────────────────────────────────────
setup_logging(level="INFO")
logger = logging.getLogger(__name__)

# ── Rate limiter ─────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT_DEFAULT])


# ── Background cache cleanup ────────────────────────────────────────────
async def _periodic_cache_cleanup():
    """Run every 5 minutes to evict expired entries."""
    while True:
        await asyncio.sleep(300)
        evicted = await cleanup_expired()
        if evicted:
            logger.info("Cache cleanup: evicted %d expired entries", evicted)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("OpenBench backend starting — initialising database …")
    await init_db()
    logger.info("Database ready. ENV=%s", settings.ENV)
    task = asyncio.create_task(_periodic_cache_cleanup())
    yield
    task.cancel()
    logger.info("OpenBench backend shutting down.")


app = FastAPI(
    title=settings.API_TITLE,
    description=(
        "Analyze, compare, and benchmark LLM models. "
        "Supports GGUF header parsing, accurate VRAM estimation, "
        "Open LLM Leaderboard integration, and optional Wolfram symbolic derivations."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# ── Middleware (order matters — outermost first) ─────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request size guard ───────────────────────────────────────────────────
@app.middleware("http")
async def limit_request_body(request: Request, call_next):
    max_bytes = settings.MAX_REQUEST_BODY_MB * 1024 * 1024
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > max_bytes:
        return JSONResponse(
            status_code=413,
            content={"detail": f"Request body too large (max {settings.MAX_REQUEST_BODY_MB} MB)"},
        )
    return await call_next(request)


# ── Routers ──────────────────────────────────────────────────────────────
app.include_router(analyze.router,        prefix="/api/v1/analyze",        tags=["Analyze"])
app.include_router(compare.router,        prefix="/api/v1/compare",        tags=["Compare"])
app.include_router(leaderboard.router,    prefix="/api/v1/leaderboard",    tags=["Leaderboard"])
app.include_router(models.router,         prefix="/api/v1/models",         tags=["Models"])
app.include_router(share.router,          prefix="/api/v1/share",          tags=["Share"])
app.include_router(community.router,      prefix="/api/v1/community",      tags=["Community"])
app.include_router(hardware_check.router, prefix="/api/v1/hardware-check", tags=["Hardware Check"])


# ── Meta endpoints ───────────────────────────────────────────────────────
@app.get("/health", tags=["Meta"])
async def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "env": settings.ENV,
        "wolfram_enabled": bool(settings.WOLFRAM_APP_ID),
        "hf_authenticated": bool(settings.HF_TOKEN),
        "cache": cache_stats(),
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
