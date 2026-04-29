"""HTTP transport for the ChainBridge SDK (sync + async)."""

from __future__ import annotations

import time
from typing import Any, Dict, Mapping, Optional

import httpx

from .errors import (
    AuthenticationError,
    ChainBridgeError,
    NetworkError,
    NotFoundError,
    RateLimitError,
    ValidationError,
)

DEFAULT_BASE_URL = "https://api.chainbridge.io"
DEFAULT_TIMEOUT = 30.0
USER_AGENT = "chainbridge-sdk-python/0.1.0"


def build_headers(api_key: Optional[str], bearer_token: Optional[str]) -> Dict[str, str]:
    headers: Dict[str, str] = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": USER_AGENT,
    }
    if api_key:
        headers["X-API-Key"] = api_key
    if bearer_token:
        headers["Authorization"] = f"Bearer {bearer_token}"
    return headers


def _decode_error(status: int, payload: Any) -> ChainBridgeError:
    code = "UNKNOWN_ERROR"
    message = ""
    if isinstance(payload, dict):
        if isinstance(payload.get("error"), dict):
            code = payload["error"].get("code", code)
            message = payload["error"].get("message", "")
        message = message or payload.get("detail") or payload.get("message", "")
    if status == 401 or status == 403:
        return AuthenticationError(message or "Unauthorized")
    if status == 404:
        return NotFoundError(code if code != "UNKNOWN_ERROR" else "NOT_FOUND", message or "Not found")
    if status == 429:
        return RateLimitError(message or "Rate limit exceeded")
    if 400 <= status < 500:
        return ValidationError(code if code != "UNKNOWN_ERROR" else "VALIDATION_ERROR", message or "Bad request")
    return ChainBridgeError(code, message or f"HTTP {status}", status=status, details=payload)


def _unwrap(response: httpx.Response) -> Any:
    if response.status_code == 204 or not response.content:
        return None
    try:
        payload = response.json()
    except ValueError:
        payload = response.text
    if not response.is_success:
        err = _decode_error(response.status_code, payload)
        if isinstance(err, RateLimitError):
            retry_after = response.headers.get("Retry-After")
            if retry_after and retry_after.isdigit():
                err.retry_after_seconds = int(retry_after)
        raise err
    if isinstance(payload, dict) and "success" in payload:
        if payload.get("success") is False:
            err_obj = payload.get("error") or {}
            raise ChainBridgeError(
                err_obj.get("code", "UNKNOWN_ERROR"),
                err_obj.get("message", ""),
                status=response.status_code,
            )
        return payload.get("data")
    return payload


class HttpClient:
    """Synchronous HTTP transport built on httpx with retry + envelope unwrap."""

    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        api_key: Optional[str] = None,
        bearer_token: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = 3,
        backoff: float = 0.5,
        transport: Optional[httpx.BaseTransport] = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._bearer_token = bearer_token
        self._max_retries = max_retries
        self._backoff = backoff
        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers=build_headers(api_key, bearer_token),
            transport=transport,
        )

    def set_bearer_token(self, token: Optional[str]) -> None:
        self._bearer_token = token
        if token is None:
            self._client.headers.pop("Authorization", None)
        else:
            self._client.headers["Authorization"] = f"Bearer {token}"

    def request(
        self,
        method: str,
        path: str,
        *,
        json: Any = None,
        params: Optional[Mapping[str, Any]] = None,
    ) -> Any:
        last_exc: Optional[Exception] = None
        for attempt in range(1, self._max_retries + 1):
            try:
                response = self._client.request(method, path, json=json, params=params)
                return _unwrap(response)
            except (httpx.TransportError, httpx.TimeoutException) as exc:
                last_exc = NetworkError(str(exc), cause=exc)
            except (RateLimitError, ChainBridgeError) as exc:
                if isinstance(exc, RateLimitError) or (
                    isinstance(exc, ChainBridgeError) and exc.status and exc.status >= 500
                ):
                    last_exc = exc
                else:
                    raise
            if attempt < self._max_retries:
                time.sleep(self._backoff * (2 ** (attempt - 1)))
        assert last_exc is not None
        raise last_exc

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "HttpClient":
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()


class AsyncHttpClient:
    """Async counterpart of :class:`HttpClient`."""

    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        api_key: Optional[str] = None,
        bearer_token: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = 3,
        backoff: float = 0.5,
        transport: Optional[httpx.AsyncBaseTransport] = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self._max_retries = max_retries
        self._backoff = backoff
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=timeout,
            headers=build_headers(api_key, bearer_token),
            transport=transport,
        )

    def set_bearer_token(self, token: Optional[str]) -> None:
        if token is None:
            self._client.headers.pop("Authorization", None)
        else:
            self._client.headers["Authorization"] = f"Bearer {token}"

    async def request(
        self,
        method: str,
        path: str,
        *,
        json: Any = None,
        params: Optional[Mapping[str, Any]] = None,
    ) -> Any:
        import asyncio

        last_exc: Optional[Exception] = None
        for attempt in range(1, self._max_retries + 1):
            try:
                response = await self._client.request(method, path, json=json, params=params)
                return _unwrap(response)
            except (httpx.TransportError, httpx.TimeoutException) as exc:
                last_exc = NetworkError(str(exc), cause=exc)
            except (RateLimitError, ChainBridgeError) as exc:
                if isinstance(exc, RateLimitError) or (
                    isinstance(exc, ChainBridgeError) and exc.status and exc.status >= 500
                ):
                    last_exc = exc
                else:
                    raise
            if attempt < self._max_retries:
                await asyncio.sleep(self._backoff * (2 ** (attempt - 1)))
        assert last_exc is not None
        raise last_exc

    async def aclose(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> "AsyncHttpClient":
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self.aclose()
