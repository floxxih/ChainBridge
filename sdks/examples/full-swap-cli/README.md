# Full Swap CLI Example

End-to-end Python walkthrough of an atomic swap. Demonstrates:

1. Asset & fee discovery
2. Order creation (with auto-generated secret + hash-lock)
3. Source-chain HTLC lock (`StubWallet`)
4. Destination-chain HTLC lock
5. Secret reveal + claim
6. Counterparty finalisation

## Running

```bash
pip install chainbridge
python main.py --dry-run
```

Against a live API:

```bash
export CHAINBRIDGE_API_KEY=cb_...
export CHAINBRIDGE_SENDER=GA...
python main.py
```

The example uses `StubWallet` for both legs so it runs without any
real chain access. Swap `StubWallet` for a concrete adapter (Stellar
Soroban, bitcoinjs, etc.) to drive an actual swap.
