import json

import httpx

from chainbridge import ChainBridgeClient
from chainbridge.crypto import derive_hash_lock
from chainbridge.http import HttpClient

def test_client_initialization():   
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={"success": True, "data": {}, "error": None}))
    http = HttpClient(
        base_url="https://api.test",
        api_key="cb_test",
        max_retries=3,
        backoff=1,
        transport=transport,
    )
    client = ChainBridgeClient(api_key="cb_test", http=http)

    assert client.http.base_url == "https://api.test"
    assert client.http.api_key == "cb_test"
    assert client.http.max_retries == 3
    assert client.http.backoff == 1
def test_create_swap_order_generates_secret_and_calls_orders():
    captured = {}

    def handler(request):
        captured["body"] = json.loads(request.content)
        captured["headers"] = dict(request.headers)
        return httpx.Response(
            200,
            json={
                "success": True,
                "data": {
                    "order_id": "order-1",
                    "from_chain": "stellar",
                    "to_chain": "bitcoin",
                    "from_asset": "XLM",
                    "to_asset": "BTC",
                    "from_amount": "1000",
                    "to_amount": "100",
                    "creator": "GA...",
                    "status": "open",
                    "expiry": "2026-04-30T00:00:00Z",
                    "created_at": "2026-04-29T00:00:00Z",
                },
                "error": None,
            },
        )

    transport = httpx.MockTransport(handler)
    http = HttpClient(
        base_url="https://api.test",
        api_key="cb_test",
        max_retries=1,
        backoff=0,
        transport=transport,
    )
    client = ChainBridgeClient(api_key="cb_test", http=http)

    order, secret, hash_lock = client.create_swap_order(
        from_chain="stellar",
        to_chain="bitcoin",
        from_asset="XLM",
        to_asset="BTC",
        from_amount="1000",
        to_amount="100",
        sender_address="GA...",
        expiry_seconds=3600,
    )

    assert order.order_id == "order-1"
    assert len(secret) == 64
    assert hash_lock == derive_hash_lock(secret)
    assert captured["body"]["expiry"] == 3600
    assert captured["headers"]["x-api-key"] == "cb_test"
