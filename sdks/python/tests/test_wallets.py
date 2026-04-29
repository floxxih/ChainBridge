from chainbridge.wallets import HtlcLockParams, HtlcWalletAdapter, StubWallet, WalletAdapter


def test_stub_wallet_satisfies_protocol():
    w = StubWallet("stellar", "GAFOO")
    assert isinstance(w, WalletAdapter)
    assert isinstance(w, HtlcWalletAdapter)


def test_stub_wallet_lifecycle():
    w = StubWallet("stellar", "GAFOO")
    assert w.is_connected()
    assert w.connect().address == "GAFOO"
    assert w.get_address() == "GAFOO"
    tx = w.lock_htlc(HtlcLockParams(receiver="GBAR", amount="1", hash_lock="ab" * 32, time_lock_seconds=3600))
    assert tx.startswith("stub-tx:")
    assert w.claim_htlc("htlc-1", "deadbeef").startswith("stub-claim:")
    assert w.refund_htlc("htlc-1").startswith("stub-refund:")
    w.disconnect()
    assert not w.is_connected()
