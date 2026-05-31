"""Redis connection pool and caching utilities (#25)."""

import json
from typing import Any, Optional
import redis.asyncio as aioredis
from .settings import settings

redis_pool: Optional[aioredis.Redis] = None


async def init_redis() -> aioredis.Redis:
    global redis_pool
    redis_pool = aioredis.from_url(settings.redis_url, decode_responses=True)
    return redis_pool


async def close_redis():
    global redis_pool
    if redis_pool:
        await redis_pool.close()
        redis_pool = None


def get_redis() -> aioredis.Redis:
    if not redis_pool:
        raise RuntimeError("Redis not initialized. Call init_redis() first.")
    return redis_pool


async def check_redis_health() -> dict:
    """Lightweight Redis PING probe used by /health (#428).

    Returns a `{status, detail?}` dict. Never raises — Redis being down
    surfaces as `degraded` rather than a 500, so the rest of the health
    response (DB, Stellar) still reaches the caller.
    """
    if not redis_pool:
        return {"status": "degraded", "detail": "not initialised"}
    try:
        pong = await redis_pool.ping()
        return {"status": "healthy"} if pong else {
            "status": "degraded",
            "detail": "ping returned falsy",
        }
    except Exception as exc:  # noqa: BLE001 - intentionally broad
        return {"status": "degraded", "detail": str(exc)[:200]}


class CacheService:
    """Caching helper with JSON serialization and TTL support."""

    def __init__(self, r: aioredis.Redis, prefix: str = "cb"):
        self.r = r
        self.prefix = prefix

    def _key(self, key: str) -> str:
        return f"{self.prefix}:{key}"

    async def get(self, key: str) -> Optional[Any]:
        raw = await self.r.get(self._key(key))
        return json.loads(raw) if raw else None

    async def set(self, key: str, value: Any, ttl: int = 300):
        await self.r.set(self._key(key), json.dumps(value, default=str), ex=ttl)

    async def delete(self, key: str):
        await self.r.delete(self._key(key))

    async def invalidate_pattern(self, pattern: str):
        async for k in self.r.scan_iter(match=self._key(pattern)):
            await self.r.delete(k)

    async def invalidate_swap(self, swap_id: str):
        """Remove all cache entries for a single swap.

        Currently invalidates ``swap:<swap_id>``.  Call this instead of
        calling ``delete`` directly so that any future swap-related cache
        keys are invalidated consistently from a single call site.
        """
        await self.delete(f"swap:{swap_id}")
