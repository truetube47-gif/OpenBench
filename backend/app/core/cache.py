"""
In-memory async-safe TTL cache.

Provides a lightweight hot-path cache layer in front of SQLite and HF API calls.
Redis can be layered on later (set REDIS_URL env var when ready) — the interface
is identical so callers need no changes.

Usage:
    from app.core.cache import get_cache, set_cache

    cached = await get_cache("my-key")
    if cached is None:
        cached = await expensive_operation()
        await set_cache("my-key", cached, ttl=3600)
"""

import asyncio
import time
import logging
from typing import Any, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

_store: dict[str, tuple[Any, float]] = {}
_lock = asyncio.Lock()

# Observability counters
_hits = 0
_misses = 0
_evictions = 0


async def get_cache(key: str) -> Optional[Any]:
    """Return cached value if it exists and has not expired, else None."""
    global _hits, _misses, _evictions
    async with _lock:
        entry = _store.get(key)
        if entry is None:
            _misses += 1
            return None
        value, expires_at = entry
        if time.monotonic() < expires_at:
            _hits += 1
            return value
        del _store[key]
        _evictions += 1
        _misses += 1
        return None


async def set_cache(key: str, value: Any, ttl: Optional[int] = None) -> None:
    """Store a value with a time-to-live in seconds."""
    if ttl is None:
        ttl = settings.CACHE_TTL_SECONDS
    async with _lock:
        _store[key] = (value, time.monotonic() + ttl)


async def delete_cache(key: str) -> None:
    """Remove a specific key from the cache."""
    async with _lock:
        _store.pop(key, None)


async def clear_all() -> None:
    """Flush the entire cache (useful in tests)."""
    async with _lock:
        _store.clear()


async def cleanup_expired() -> int:
    """Remove all expired entries. Returns count of evicted keys."""
    global _evictions
    now = time.monotonic()
    async with _lock:
        expired = [k for k, (_, exp) in _store.items() if exp <= now]
        for k in expired:
            del _store[k]
        _evictions += len(expired)
        return len(expired)


def cache_size() -> int:
    """Return the number of unexpired entries (approximate)."""
    now = time.monotonic()
    return sum(1 for _, (_, exp) in _store.items() if exp > now)


def cache_stats() -> dict:
    """Return cache observability metrics."""
    return {
        "size": cache_size(),
        "total_entries": len(_store),
        "hits": _hits,
        "misses": _misses,
        "evictions": _evictions,
        "hit_rate": round(_hits / max(_hits + _misses, 1) * 100, 1),
    }
