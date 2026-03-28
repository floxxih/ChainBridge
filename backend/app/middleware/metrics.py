"""HTTP middleware that captures request throughput and latency metrics."""

from __future__ import annotations

from time import perf_counter

from starlette.middleware.base import BaseHTTPMiddleware

from app.observability.metrics import HTTP_REQUEST_DURATION_SECONDS, HTTP_REQUESTS_TOTAL


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start = perf_counter()
        method = request.method

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception:
            duration = perf_counter() - start
            route = request.scope.get("route")
            route_path = route.path if route else request.url.path
            HTTP_REQUESTS_TOTAL.labels(
                method=method,
                route=route_path,
                status="500",
            ).inc()
            HTTP_REQUEST_DURATION_SECONDS.labels(
                method=method,
                route=route_path,
                status="500",
            ).observe(duration)
            raise

        duration = perf_counter() - start
        route = request.scope.get("route")
        route_path = route.path if route else request.url.path

        status_label = str(status_code)
        HTTP_REQUESTS_TOTAL.labels(
            method=method,
            route=route_path,
            status=status_label,
        ).inc()
        HTTP_REQUEST_DURATION_SECONDS.labels(
            method=method,
            route=route_path,
            status=status_label,
        ).observe(duration)
        response.headers["X-Response-Time-Ms"] = f"{duration * 1000:.2f}"
        return response
