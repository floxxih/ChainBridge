"""Error types raised by the ChainBridge SDK."""

from __future__ import annotations

from typing import Any, Optional


class ChainBridgeError(Exception):
    """Base error for all SDK exceptions."""

    def __init__(
        self,
        code: str,
        message: str,
        *,
        status: Optional[int] = None,
        details: Any = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.details = details

    def __repr__(self) -> str:
        return f"{type(self).__name__}(code={self.code!r}, message={self.message!r})"


class NetworkError(ChainBridgeError):
    """Raised when a network-level failure occurs (timeouts, DNS, etc.)."""

    def __init__(self, message: str, *, cause: Any = None) -> None:
        super().__init__("NETWORK_ERROR", message, details=cause)


class AuthenticationError(ChainBridgeError):
    """Raised on 401/403 responses."""

    def __init__(self, message: str = "Invalid or missing API key") -> None:
        super().__init__("UNAUTHORIZED", message, status=401)


class RateLimitError(ChainBridgeError):
    """Raised on 429 responses. Exposes `retry_after_seconds` when supplied."""

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after_seconds: Optional[int] = None,
    ) -> None:
        super().__init__("RATE_LIMIT", message, status=429)
        self.retry_after_seconds = retry_after_seconds


class NotFoundError(ChainBridgeError):
    """Raised on 404 responses."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(code, message, status=404)


class ValidationError(ChainBridgeError):
    """Raised on 4xx responses other than 401/403/404/429."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(code, message, status=400)
