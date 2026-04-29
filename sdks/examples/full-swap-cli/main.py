"""Full atomic-swap CLI walkthrough using the ChainBridge Python SDK.

Demonstrates the entire happy-path flow: discover assets → estimate fees →
create order → lock HTLC → claim with secret → confirm.

Designed to run against a local dev backend with stub-friendly responses,
or against testnet with real keys. Pass --dry-run to use StubWallet only.
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from typing import Optional

from chainbridge import ChainBridgeClient, ChainBridgeError
from chainbridge.crypto import recommended_timelocks
from chainbridge.wallets import HtlcLockParams, StubWallet


@dataclass
class SwapInputs:
    api_key: str
    base_url: str
    sender: str
    receiver: str
    from_amount: str
    to_amount: str
    expiry_seconds: int
    dry_run: bool


def parse_args() -> SwapInputs:
    p = argparse.ArgumentParser(description="ChainBridge atomic swap walkthrough")
    p.add_argument("--api-key", default=os.environ.get("CHAINBRIDGE_API_KEY", ""))
    p.add_argument("--base-url", default=os.environ.get("CHAINBRIDGE_API_URL", "http://localhost:8000"))
    p.add_argument("--sender", default=os.environ.get("CHAINBRIDGE_SENDER", "GA" + "X" * 54))
    p.add_argument("--receiver", default=os.environ.get("CHAINBRIDGE_RECEIVER", "bc1q" + "x" * 38))
    p.add_argument("--from-amount", default="1000000000")
    p.add_argument("--to-amount", default="10000")
    p.add_argument("--expiry-seconds", type=int, default=86_400)
    p.add_argument("--dry-run", action="store_true", help="Use StubWallet, do not call live wallet")
    args = p.parse_args()
    return SwapInputs(
        api_key=args.api_key,
        base_url=args.base_url,
        sender=args.sender,
        receiver=args.receiver,
        from_amount=args.from_amount,
        to_amount=args.to_amount,
        expiry_seconds=args.expiry_seconds,
        dry_run=args.dry_run,
    )


def step(n: int, title: str) -> None:
    print(f"\n[{n}] {title}")


def main() -> int:
    inputs = parse_args()
    if not inputs.api_key and not inputs.dry_run:
        print("Set --api-key or CHAINBRIDGE_API_KEY (or use --dry-run).", file=sys.stderr)
        return 2

    client = ChainBridgeClient(api_key=inputs.api_key or None, base_url=inputs.base_url)
    sender_wallet = StubWallet("stellar", inputs.sender)
    receiver_wallet = StubWallet("bitcoin", inputs.receiver)

    try:
        step(1, "Discover supported Stellar assets")
        try:
            assets = client.assets.list(chain="stellar")
            print(f"  Found {len(assets)} asset(s); first: {assets[0].symbol if assets else 'n/a'}")
        except ChainBridgeError as exc:
            print(f"  (skipped: {exc.code})")

        step(2, "Estimate swap fees")
        try:
            fees = client.market.estimate_fees(
                from_chain="stellar", to_chain="bitcoin", from_amount=inputs.from_amount
            )
            print(f"  Total fee (USD): {fees.total_fee_usd}; protocol bps: {fees.protocol_fee_bps}")
        except ChainBridgeError as exc:
            print(f"  (skipped: {exc.code})")

        step(3, "Create swap order with hash-locked secret")
        if inputs.dry_run:
            from chainbridge.crypto import derive_hash_lock, generate_secret
            secret = generate_secret()
            hash_lock = derive_hash_lock(secret)
            order_id = "dry-run-order-1"
            print("  (dry-run: skipping live POST /orders)")
        else:
            order, secret, hash_lock = client.create_swap_order(
                from_chain="stellar",
                to_chain="bitcoin",
                from_asset="XLM",
                to_asset="BTC",
                from_amount=inputs.from_amount,
                to_amount=inputs.to_amount,
                sender_address=inputs.sender,
                expiry_seconds=inputs.expiry_seconds,
            )
            order_id = order.order_id
        print(f"  order_id={order_id}")
        print(f"  hash_lock={hash_lock}")
        print(f"  secret (PRIVATE)={secret[:16]}…")

        step(4, "Lock funds on source chain (sender wallet)")
        source_secs, dest_secs = recommended_timelocks(inputs.expiry_seconds)
        lock_tx = sender_wallet.lock_htlc(
            HtlcLockParams(
                receiver=inputs.receiver,
                amount=inputs.from_amount,
                hash_lock=hash_lock,
                time_lock_seconds=source_secs,
                asset="XLM",
            )
        )
        print(f"  source lock tx: {lock_tx} (timelock={source_secs}s)")

        step(5, "Counterparty locks funds on destination chain")
        dest_lock_tx = receiver_wallet.lock_htlc(
            HtlcLockParams(
                receiver=inputs.sender,
                amount=inputs.to_amount,
                hash_lock=hash_lock,
                time_lock_seconds=dest_secs,
                asset="BTC",
            )
        )
        print(f"  destination lock tx: {dest_lock_tx} (timelock={dest_secs}s)")

        step(6, "Claim destination HTLC by revealing secret")
        claim_tx = receiver_wallet.claim_htlc(dest_lock_tx, secret)
        print(f"  claim tx: {claim_tx}")

        step(7, "Counterparty uses revealed secret to claim source HTLC")
        finalize_tx = sender_wallet.claim_htlc(lock_tx, secret)
        print(f"  finalize tx: {finalize_tx}")

        print("\nSwap complete (dry-run flow).")
        return 0
    finally:
        client.close()


if __name__ == "__main__":
    raise SystemExit(main())
