"""Rate limiting middleware using Redis (#27)."""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.config.settings import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-IP rate limiting backed by Redis sliding window counters."""

    async def dispatch(self, request: Request, call_next):
        if not settings.rate_limit_enabled:
            return await call_next(request)

        from app.config.redis import redis_pool

        if not redis_pool:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        api_key = request.headers.get("X-API-Key", "")
        rate_key = f"rl:{api_key or client_ip}"

        window = settings.rate_limit_window_seconds
        max_requests = settings.rate_limit_requests

        current = await redis_pool.incr(rate_key)
        if current == 1:
            await redis_pool.expire(rate_key, window)

        ttl = await redis_pool.ttl(rate_key)

        if current > max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded", "retry_after": ttl},
                headers={
                    "Retry-After": str(ttl),
                    "X-RateLimit-Limit": str(max_requests),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(max(0, max_requests - current))
        response.headers["X-RateLimit-Reset"] = str(ttl)
        return response
