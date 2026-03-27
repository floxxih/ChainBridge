"""Shared test fixtures for ChainBridge API tests."""

import pathlib
import sys

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from app.main import app


@pytest.fixture
def mock_db():
    """Mock database session."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


@pytest.fixture
def mock_redis():
    """Mock Redis client."""
    redis = MagicMock()
    redis.get = AsyncMock(return_value=None)
    redis.set = AsyncMock()
    redis.delete = AsyncMock()
    return redis


@pytest.fixture
def mock_stellar_client():
    """Mock Stellar/Soroban client for testing without network."""
    client = MagicMock()
    client.invoke_contract = AsyncMock(return_value="mock_result")
    client.get_transaction_status = AsyncMock(
        return_value={"hash": "abc123", "status": "SUCCESS", "ledger": 1000}
    )
    client.get_contract_events = AsyncMock(return_value=[])
    client.get_latest_ledger = AsyncMock(return_value=5000)
    client.health_check = AsyncMock(
        return_value={
            "status": "healthy",
            "rpc_url": "https://soroban-testnet.stellar.org",
        }
    )
    return client


@pytest.fixture
async def client():
    """Async HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def make_swap(overrides=None):
    """Factory for mock swap objects."""
    swap = MagicMock()
    defaults = {
        "id": "swap-001",
        "onchain_id": "onchain-001",
        "stellar_htlc_id": "htlc-001",
        "other_chain": "bitcoin",
        "other_chain_tx": None,
        "stellar_party": "GABC123",
        "other_party": "bc1qtest",
        "state": "initiated",
        "created_at": "2026-01-01T00:00:00Z",
    }
    if overrides:
        defaults.update(overrides)
    for k, v in defaults.items():
        setattr(swap, k, v)
    return swap


def make_htlc(overrides=None):
    """Factory for mock HTLC objects."""
    htlc = MagicMock()
    defaults = {
        "id": "htlc-001",
        "onchain_id": "onchain-htlc-001",
        "amount": 10_000_000,
        "hash_lock": "abc123hash",
        "time_lock": 1735689600,
        "sender": "GABC123",
        "receiver": "GDEF456",
        "status": "active",
        "hash_algorithm": "sha256",
        "secret": None,
        "updated_at": None,
        "created_at": "2026-01-01T00:00:00Z",
    }
    if overrides:
        defaults.update(overrides)
    for k, v in defaults.items():
        setattr(htlc, k, v)
    return htlc
