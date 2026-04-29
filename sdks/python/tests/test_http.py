import httpx
import pytest

from chainbridge.errors import (
    AuthenticationError,
    NotFoundError,
    RateLimitError,
    ValidationError,
)
from chainbridge.http import HttpClient


def make_client(handler):
    transport = httpx.MockTransport(handler)
    return HttpClient(
        base_url="https://api.test",
        api_key="cb_test",
        max_retries=1,
        backoff=0.0,
        transport=transport,
    )


def test_unwraps_envelope():
    def handler(request):
        return httpx.Response(200, json={"success": True, "data": {"ok": True}, "error": None})

    client = make_client(handler)
    assert client.request("GET", "/api/v1/orders") == {"ok": True}


def test_authentication_error_on_401():
    def handler(request):
        return httpx.Response(401, json={"detail": "bad key"})

    client = make_client(handler)
    with pytest.raises(AuthenticationError):
        client.request("GET", "/x")


def test_not_found_on_404():
    def handler(request):
        return httpx.Response(404, json={"error": {"code": "ORDER_NOT_FOUND", "message": "nope"}})

    client = make_client(handler)
    with pytest.raises(NotFoundError):
        client.request("GET", "/x")


def test_validation_error_on_400():
    def handler(request):
        return httpx.Response(400, json={"error": {"code": "INVALID_AMOUNT", "message": "bad"}})

    client = make_client(handler)
    with pytest.raises(ValidationError):
        client.request("POST", "/x", json={"a": 1})


def test_api_key_header_set():
    captured = {}

    def handler(request):
        captured["headers"] = dict(request.headers)
        return httpx.Response(200, json={"success": True, "data": {}, "error": None})

    client = make_client(handler)
    client.request("GET", "/api/v1/market/fees/stellar")
    assert captured["headers"]["x-api-key"] == "cb_test"


def test_rate_limit_retries_then_succeeds():
    calls = {"n": 0}

    def handler(request):
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(429, headers={"Retry-After": "0"}, json={"detail": "slow"})
        return httpx.Response(200, json={"success": True, "data": {"ok": 1}, "error": None})

    transport = httpx.MockTransport(handler)
    client = HttpClient(
        base_url="https://api.test",
        api_key="cb_test",
        max_retries=2,
        backoff=0.0,
        transport=transport,
    )
    assert client.request("GET", "/x") == {"ok": 1}
    assert calls["n"] == 2


def test_rate_limit_exhausts_retries():
    def handler(request):
        return httpx.Response(429, json={"detail": "slow"})

    client = make_client(handler)
    with pytest.raises(RateLimitError):
        client.request("GET", "/x")
