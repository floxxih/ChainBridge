"""Tests for rate limiting middleware."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import Request, Response
from starlette.responses import JSONResponse


@pytest.mark.anyio
async def test_rate_limit_disabled():
    with patch("app.middleware.rate_limit.settings") as mock_settings:
        mock_settings.rate_limit_enabled = False

        from app.middleware.rate_limit import RateLimitMiddleware

        middleware = RateLimitMiddleware(app=None)

        mock_request = MagicMock(spec=Request)
        mock_request.client.host = "127.0.0.1"
        mock_request.headers.get = MagicMock(return_value="")

        next_handler = AsyncMock(return_value=Response(status_code=200))

        result = await middleware.dispatch(mock_request, next_handler)

        assert result.status_code == 200
        next_handler.assert_called_once()


@pytest.mark.anyio
async def test_rate_limit_enabled_enforces_limit():
    with patch("app.middleware.rate_limit.settings") as mock_settings:
        mock_settings.rate_limit_enabled = True
        mock_settings.rate_limit_requests = 2
        mock_settings.rate_limit_window_seconds = 60

        with patch("app.middleware.rate_limit.redis_pool") as mock_redis:
            from app.middleware.rate_limit import RateLimitMiddleware

            middleware = RateLimitMiddleware(app=None)

            mock_request = MagicMock(spec=Request)
            mock_request.client.host = "127.0.0.1"
            mock_request.headers.get = MagicMock(return_value="")

            mock_response = Response(status_code=200)
            mock_response.headers = {}
            next_handler = AsyncMock(return_value=mock_response)

            mock_redis.incr = AsyncMock(return_value=3)
            mock_redis.expire = AsyncMock()
            mock_redis.ttl = AsyncMock(return_value=45)

            result = await middleware.dispatch(mock_request, next_handler)

            assert result.status_code == 429
            assert result.headers.get("Retry-After") == "45"


@pytest.mark.anyio
async def test_rate_limit_enabled_allows_under_limit():
    with patch("app.middleware.rate_limit.settings") as mock_settings:
        mock_settings.rate_limit_enabled = True
        mock_settings.rate_limit_requests = 10
        mock_settings.rate_limit_window_seconds = 60

        with patch("app.middleware.rate_limit.redis_pool") as mock_redis:
            from app.middleware.rate_limit import RateLimitMiddleware

            middleware = RateLimitMiddleware(app=None)

            mock_request = MagicMock(spec=Request)
            mock_request.client.host = "127.0.0.1"
            mock_request.headers.get = MagicMock(return_value="")

            mock_response = Response(status_code=200)
            mock_response.headers = {}
            next_handler = AsyncMock(return_value=mock_response)

            mock_redis.incr = AsyncMock(return_value=5)
            mock_redis.expire = AsyncMock()
            mock_redis.ttl = AsyncMock(return_value=50)

            result = await middleware.dispatch(mock_request, next_handler)

            assert result.status_code == 200
            assert result.headers.get("X-RateLimit-Limit") == "10"
            assert result.headers.get("X-RateLimit-Remaining") == "5"


@pytest.mark.anyio
async def test_rate_limit_no_redis_allows_requests():
    with patch("app.middleware.rate_limit.settings") as mock_settings:
        mock_settings.rate_limit_enabled = True
        mock_settings.rate_limit_requests = 10
        mock_settings.rate_limit_window_seconds = 60

        with patch("app.middleware.rate_limit.redis_pool", None):
            from app.middleware.rate_limit import RateLimitMiddleware

            middleware = RateLimitMiddleware(app=None)

            mock_request = MagicMock(spec=Request)
            mock_request.client.host = "127.0.0.1"
            mock_request.headers.get = MagicMock(return_value="")

            mock_response = Response(status_code=200)
            next_handler = AsyncMock(return_value=mock_response)

            result = await middleware.dispatch(mock_request, next_handler)

            assert result.status_code == 200
