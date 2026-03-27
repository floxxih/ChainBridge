"""Tests for HTLC API endpoints."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.htlc import HTLC
from app.routes.htlc import get_htlc, get_htlc_status, list_htlcs
from app.schemas.htlc import HTLCResponse


def make_htlc(**overrides):
    now = datetime.now(timezone.utc)
    values = {
        "id": uuid4(),
        "onchain_id": "htlc-onchain-1",
        "sender": "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
        "receiver": "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
        "amount": 1000,
        "hash_lock": "abc123",
        "time_lock": int((now + timedelta(hours=2)).timestamp()),
        "status": "active",
        "secret": None,
        "hash_algorithm": "sha256",
        "created_at": now,
        "updated_at": now,
    }
    values.update(overrides)
    htlc = HTLC()
    for key, value in values.items():
        setattr(htlc, key, value)
    return htlc


class TestHTLCSchemas:
    def test_htlc_response_from_dict(self):
        data = {
            "id": "htlc-001",
            "amount": 10_000_000,
            "hash_lock": "abc123",
            "time_lock": 1735689600,
            "sender": "GABC",
            "receiver": "GDEF",
            "status": "active",
            "hash_algorithm": "sha256",
        }
        resp = HTLCResponse(**data)
        assert resp.id == "htlc-001"
        assert resp.status == "active"
        assert resp.amount == 10_000_000


class TestHTLCEndpoints:
    @pytest.mark.anyio
    async def test_list_htlcs_returns_empty(self):
        mock_db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        mock_db.execute = AsyncMock(return_value=result_mock)

        result = await list_htlcs(db=mock_db)
        assert result == []

    @pytest.mark.anyio
    async def test_get_htlc_not_found(self):
        from fastapi import HTTPException

        mock_db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result_mock)

        with patch("app.routes.htlc.get_redis", return_value=MagicMock()):
            with patch("app.routes.htlc.CacheService") as mock_cache_cls:
                mock_cache = MagicMock()
                mock_cache.get = AsyncMock(return_value=None)
                mock_cache_cls.return_value = mock_cache

                with pytest.raises(HTTPException) as exc_info:
                    await get_htlc("nonexistent", db=mock_db)
                assert exc_info.value.status_code == 404

    @pytest.mark.anyio
    async def test_get_htlc_status_adds_claim_and_refund_flags(self):
        active_htlc = make_htlc()
        mock_db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = active_htlc
        mock_db.execute = AsyncMock(return_value=result_mock)

        result = await get_htlc_status(str(active_htlc.id), db=mock_db)

        assert result["can_claim"] is True
        assert result["can_refund"] is False
        assert result["phase"] == "claimable"
