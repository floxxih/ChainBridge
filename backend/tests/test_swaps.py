"""Tests for swap API endpoints."""

import json

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.schemas.swap import BatchProofItemResult, BatchProofResponse, SwapResponse, SwapProof


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


class TestBatchVerifyErrors:
    """Safe structured errors from batch proof verification (#437)."""

    @pytest.mark.anyio
    async def test_known_validation_errors_remain_useful(self):
        from app.routes.swaps import batch_verify_proofs
        from app.schemas.swap import BatchProofRequest, SwapProofItem, SwapProof

        mock_db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result_mock)

        proof = SwapProof(chain="bitcoin", tx_hash="tx1", block_height=100, proof_data="abc")
        req = BatchProofRequest(items=[SwapProofItem(swap_id="missing-id", proof=proof)])

        with (
            patch("app.routes.swaps.get_redis", return_value=MagicMock()),
            patch("app.routes.swaps.CacheService", return_value=AsyncMock()),
        ):
            result = await batch_verify_proofs(req, db=mock_db)

        assert result.failed == 1
        assert result.items[0].error == "Swap not found"

    @pytest.mark.anyio
    async def test_unexpected_errors_return_generic_message(self):
        from app.routes.swaps import batch_verify_proofs
        from app.schemas.swap import BatchProofRequest, SwapProofItem, SwapProof

        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(side_effect=ValueError("something broke"))

        proof = SwapProof(chain="bitcoin", tx_hash="tx1", block_height=100, proof_data="abc")
        req = BatchProofRequest(items=[SwapProofItem(swap_id="swap-1", proof=proof)])

        with (
            patch("app.routes.swaps.get_redis", return_value=MagicMock()),
            patch("app.routes.swaps.CacheService", return_value=AsyncMock()),
            patch("app.routes.swaps.logger") as mock_logger,
        ):
            result = await batch_verify_proofs(req, db=mock_db)

        assert result.failed == 1
        assert result.items[0].error == "Verification failed unexpectedly"
        mock_logger.exception.assert_called_once()


class TestCacheInvalidation:
    """Cache invalidation helper tests (#436)."""

    @pytest.mark.anyio
    async def test_invalidate_swap_deletes_swap_key(self):
        from app.config.redis import CacheService

        mock_redis = MagicMock()
        mock_redis.delete = AsyncMock()
        cache = CacheService(mock_redis, prefix="cb")

        await cache.invalidate_swap("swap-001")

        mock_redis.delete.assert_awaited_once_with("cb:swap:swap-001")

    @pytest.mark.anyio
    async def test_cache_invalidate_swap_called_on_verify_proof(self):
        from app.routes.swaps import verify_proof
        from app.schemas.swap import SwapProof

        swap = MagicMock()
        swap.id = "swap-1"
        swap.onchain_id = None
        swap.stellar_htlc_id = None
        swap.other_chain = "bitcoin"
        swap.other_chain_tx = None
        swap.stellar_party = "GABC123"
        swap.other_party = "bc1qtest"
        swap.state = "initiated"
        swap.created_at = None
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = swap
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(return_value=result_mock)

        mock_cache = AsyncMock()
        mock_cache.invalidate_swap = AsyncMock()

        proof = SwapProof(chain="bitcoin", tx_hash="tx1", block_height=100, proof_data="abc")

        with (
            patch("app.routes.swaps.get_redis", return_value=MagicMock()),
            patch("app.routes.swaps.CacheService", return_value=mock_cache),
            patch("app.routes.swaps.emit_swap_event", return_value=None),
            patch("app.routes.swaps.observe_swap_completion", return_value=None),
        ):
            await verify_proof("swap-1", proof, db=mock_db)

        mock_cache.invalidate_swap.assert_awaited_once_with("swap-1")

    @pytest.mark.anyio
    async def test_cache_invalidate_swap_called_on_batch_verify(self):
        from app.routes.swaps import batch_verify_proofs
        from app.schemas.swap import BatchProofRequest, SwapProofItem, SwapProof

        swap = MagicMock()
        swap.id = "swap-1"
        swap.onchain_id = None
        swap.stellar_htlc_id = None
        swap.other_chain = "bitcoin"
        swap.other_chain_tx = None
        swap.stellar_party = "GABC123"
        swap.other_party = "bc1qtest"
        swap.state = "initiated"
        swap.created_at = None
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = swap
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock(return_value=result_mock)

        mock_cache = AsyncMock()
        mock_cache.invalidate_swap = AsyncMock()

        proof = SwapProof(chain="bitcoin", tx_hash="tx1", block_height=100, proof_data="abc")
        req = BatchProofRequest(items=[SwapProofItem(swap_id="swap-1", proof=proof)])

        with (
            patch("app.routes.swaps.get_redis", return_value=MagicMock()),
            patch("app.routes.swaps.CacheService", return_value=mock_cache),
            patch("app.routes.swaps.emit_swap_event", return_value=None),
            patch("app.routes.swaps.observe_swap_completion", return_value=None),
        ):
            result = await batch_verify_proofs(req, db=mock_db)

        mock_cache.invalidate_swap.assert_awaited_once_with("swap-1")
        assert result.succeeded == 1
        assert result.failed == 0
