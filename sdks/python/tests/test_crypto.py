import re
from datetime import datetime, timezone

from chainbridge.crypto import (
    derive_hash_lock,
    expiry_from_now,
    generate_secret,
    recommended_timelocks,
    verify_secret,
)


def test_generate_secret_default_length():
    secret = generate_secret()
    assert re.fullmatch(r"[0-9a-f]{64}", secret)


def test_derive_hash_lock_is_deterministic():
    secret = "deadbeef" * 8
    h1 = derive_hash_lock(secret)
    h2 = derive_hash_lock(secret)
    assert h1 == h2
    assert len(h1) == 64


def test_verify_secret_round_trip():
    secret = generate_secret()
    assert verify_secret(secret, derive_hash_lock(secret))


def test_verify_secret_rejects_mismatch():
    a = generate_secret()
    b = generate_secret()
    assert not verify_secret(a, derive_hash_lock(b))


def test_expiry_from_now_uses_provided_base():
    base = datetime(2026, 4, 29, tzinfo=timezone.utc)
    out = expiry_from_now(3600, now=base)
    assert out == "2026-04-29T01:00:00Z"


def test_recommended_timelocks_split():
    src, dst = recommended_timelocks(86400)
    assert src == 86400
    assert dst == 43200
