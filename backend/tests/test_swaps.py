"""Tests for swap API endpoints."""

import json

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.schemas.swap import SwapResponse, SwapProof


class TestListSwaps:
    """GET /api/swaps/ tests."""

    @pytest.mark.anyio
    async def test_list_swaps_returns_empty_when_no_swaps(self):
        from app.routes.swaps import list_swaps

        mock_db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        mock_db.execute = AsyncMock(return_value=result_mock)

        result = await list_swaps(db=mock_db)
        assert result == []

    @pytest.mark.anyio
    async def test_list_swaps_filters_by_chain(self):
        from app.routes.swaps import list_swaps

        mock_db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        mock_db.execute = AsyncMock(return_value=result_mock)

        result = await list_swaps(chain="bitcoin", db=mock_db)
        assert result == []
        mock_db.execute.assert_called_once()

    @pytest.mark.anyio
    async def test_list_swaps_filters_by_state(self):
        from app.routes.swaps import list_swaps

        mock_db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        mock_db.execute = AsyncMock(return_value=result_mock)

        result = await list_swaps(state="initiated", db=mock_db)
        assert result == []

    @pytest.mark.anyio
    async def test_list_swaps_respects_limit(self):
        from app.routes.swaps import list_swaps

        mock_db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        mock_db.execute = AsyncMock(return_value=result_mock)

        result = await list_swaps(limit=10, offset=5, db=mock_db)
        assert result == []


class TestGetSwap:
    """GET /api/swaps/{swap_id} tests."""

    @pytest.mark.anyio
    async def test_get_swap_not_found_returns_404(self):
        from app.routes.swaps import get_swap
        from fastapi import HTTPException

        mock_db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result_mock)

        with patch("app.routes.swaps.get_redis", return_value=MagicMock()):
            with patch("app.routes.swaps.CacheService") as mock_cache_cls:
                mock_cache = MagicMock()
                mock_cache.get = AsyncMock(return_value=None)
                mock_cache_cls.return_value = mock_cache

                with pytest.raises(HTTPException) as exc_info:
                    await get_swap("nonexistent-id", db=mock_db)
                assert exc_info.value.status_code == 404


class TestVerifyProof:
    """POST /api/swaps/{swap_id}/verify-proof tests."""

    @pytest.mark.anyio
    async def test_verify_proof_not_found_returns_404(self):
        from app.routes.swaps import verify_proof
        from fastapi import HTTPException

        mock_db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result_mock)

        proof = SwapProof(
            chain="bitcoin",
            tx_hash="abc123",
            block_height=800000,
            proof_data="proof_hex",
        )

        with pytest.raises(HTTPException) as exc_info:
            await verify_proof("nonexistent", proof, db=mock_db)
        assert exc_info.value.status_code == 404

    @pytest.mark.anyio
    async def test_verify_proof_rejects_invalid_solana_payload(self):
        from app.routes.swaps import verify_proof
        from fastapi import HTTPException

        swap = MagicMock()
        swap.id = "swap-1"
        swap.state = "initiated"
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = swap
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(return_value=result_mock)

        proof = SwapProof(
            chain="solana",
            tx_hash="solana-tx",
            block_height=1,
            proof_data=json.dumps({"message": "missing signature"}),
        )

        with pytest.raises(HTTPException) as exc_info:
            await verify_proof("swap-1", proof, db=mock_db)
        assert exc_info.value.status_code == 400


class TestSwapSchemas:
    """Schema validation tests."""

    def test_swap_response_from_dict(self):
        data = {
            "id": "swap-001",
            "other_chain": "bitcoin",
            "stellar_party": "GABC",
            "other_party": "bc1q",
            "state": "initiated",
        }
        resp = SwapResponse(**data)
        assert resp.id == "swap-001"
        assert resp.state == "initiated"
        assert resp.onchain_id is None

    def test_swap_proof_validation(self):
        proof = SwapProof(
            chain="bitcoin",
            tx_hash="abc123",
            block_height=800000,
            proof_data="deadbeef",
        )
        assert proof.chain == "bitcoin"
        assert proof.block_height == 800000

    def test_swap_proof_rejects_missing_fields(self):
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            SwapProof(chain="bitcoin")  # missing required fields
