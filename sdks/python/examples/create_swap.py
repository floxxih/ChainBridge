"""End-to-end example: create an XLM→BTC swap order with the Python SDK.

Run with:
    pip install chainbridge
    export CHAINBRIDGE_API_KEY=cb_xxx
    export CHAINBRIDGE_SENDER=GA...
    python create_swap.py
"""

from __future__ import annotations

import os
import sys

from chainbridge import ChainBridgeClient


def main() -> int:
    api_key = os.environ.get("CHAINBRIDGE_API_KEY")
    sender = os.environ.get("CHAINBRIDGE_SENDER")
    if not api_key or not sender:
        print("Set CHAINBRIDGE_API_KEY and CHAINBRIDGE_SENDER first.", file=sys.stderr)
        return 1

    with ChainBridgeClient(api_key=api_key) as client:
        fees = client.market.estimate_fees(
            from_chain="stellar", to_chain="bitcoin", from_amount="1000000000"
        )
        print(f"Estimated fees: {fees}")

        order, secret, hash_lock = client.create_swap_order(
            from_chain="stellar",
            to_chain="bitcoin",
            from_asset="XLM",
            to_asset="BTC",
            from_amount="1000000000",
            to_amount="10000",
            sender_address=sender,
            expiry_seconds=86_400,
        )
        print(f"Created order: {order.order_id}")
        print(f"Hash-lock (share with counterparty): {hash_lock}")
        print(f"Secret (KEEP PRIVATE until claim): {secret}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
