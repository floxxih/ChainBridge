"""Tests for asset endpoints."""

from uuid import uuid4
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy import select

from app.models.asset import Asset
from app.schemas.asset import AssetResponse, AssetCreate


def make_asset(**overrides):
    values = {
        "id": uuid4(),
        "chain": "stellar",
        "address": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
        "symbol": "USDC",
        "name": "USD Coin",
        "decimals": 6,
        "description": "Stablecoin from Circle",
        "icon_url": None,
        "website_url": None,
        "is_verified": True,
        "is_active": True,
        "tags": None,
    }
    values.update(overrides)
    asset = Asset()
    for key, value in values.items():
        setattr(asset, key, value)
    return asset


class TestAssetSchemas:
    def test_asset_response_from_dict(self):
        data = {
            "id": "asset-001",
            "chain": "stellar",
            "address": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
            "symbol": "USDC",
            "name": "USD Coin",
            "decimals": 6,
            "is_verified": True,
            "is_active": True,
        }
        resp = AssetResponse(**data)
        assert resp.id == "asset-001"
        assert resp.chain == "stellar"
        assert resp.symbol == "USDC"


class TestAssetEndpoints:
    @pytest.mark.anyio
    async def test_create_asset_success(self, client, mock_db):
        with patch("app.routes.assets.get_db", return_value=mock_db):
            with patch("app.routes.assets.require_api_key", return_value=None):
                mock_db.execute = AsyncMock()
                mock_db.execute.return_value.scalar_one_or_none = MagicMock(return_value=None)
                mock_db.commit = AsyncMock()
                mock_db.refresh = AsyncMock()

                response = await client.post(
                    "/assets/",
                    json={
                        "chain": "stellar",
                        "address": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
                        "symbol": "USDC",
                        "name": "USD Coin",
                        "decimals": 6,
                    },
                    headers={"X-API-Key": "test-key"},
                )
                assert response.status_code == 200

    @pytest.mark.anyio
    async def test_create_asset_duplicate_returns_conflict(self, client, mock_db):
        with patch("app.routes.assets.get_db", return_value=mock_db):
            with patch("app.routes.assets.require_api_key", return_value=None):
                existing_asset = make_asset(
                    chain="stellar",
                    address="CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
                    symbol="USDC",
                )
                mock_db.execute = AsyncMock()
                mock_db.execute.return_value.scalar_one_or_none = MagicMock(return_value=existing_asset)

                response = await client.post(
                    "/assets/",
                    json={
                        "chain": "stellar",
                        "address": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4",
                        "symbol": "USDC",
                        "name": "USD Coin",
                        "decimals": 6,
                    },
                    headers={"X-API-Key": "test-key"},
                )
                assert response.status_code == 409
                assert response.json()["detail"] == "conflict"

    @pytest.mark.anyio
    async def test_list_assets_unchanged(self, client, mock_db):
        with patch("app.routes.assets.get_db", return_value=mock_db):
            mock_db.execute = AsyncMock()
            mock_db.execute.return_value.scalars.return_value.all = MagicMock(return_value=[])

            response = await client.get("/assets/")
            assert response.status_code == 200
            assert response.json() == []
