"""Tests for order schemas and matching."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.models.order import SwapOrder
from app.schemas.order import OrderResponse
from app.services.order_matching import OrderMatchingService


def make_order(**overrides):
    now = datetime.now(timezone.utc)
    values = {
        "id": uuid4(),
        "creator": "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
        "from_chain": "stellar",
        "to_chain": "ethereum",
        "from_asset": "XLM",
        "to_asset": "USDC",
        "from_amount": 100,
        "to_amount": 200,
        "min_fill_amount": None,
        "filled_amount": 0,
        "expiry": int((now + timedelta(hours=1)).timestamp()),
        "status": "open",
        "counterparty": None,
        "created_at": now,
    }
    values.update(overrides)
    order = SwapOrder()
    for key, value in values.items():
        setattr(order, key, value)
    return order


class TestOrderSchemas:
    def test_order_response_from_dict(self):
        data = {
            "id": "order-001",
            "creator": "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
            "from_chain": "stellar",
            "to_chain": "ethereum",
            "from_asset": "XLM",
            "to_asset": "USDC",
            "from_amount": 100,
            "to_amount": 200,
            "filled_amount": 0,
            "expiry": 9999999999,
            "status": "open",
        }
        resp = OrderResponse(**data)
        assert resp.id == "order-001"
        assert resp.status == "open"


class TestOrderMatchingService:
    @pytest.mark.anyio
    async def test_matches_price_time_priority(self):
        service = OrderMatchingService()
        taker = make_order(from_amount=100, to_amount=200)
        better_price = make_order(
            creator="0x52908400098527886E0F7030069857D2E4169EE7",
            from_chain="ethereum",
            to_chain="stellar",
            from_asset="USDC",
            to_asset="XLM",
            from_amount=240,
            to_amount=100,
            created_at=datetime.now(timezone.utc) - timedelta(minutes=2),
        )
        older_same_price = make_order(
            creator="0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
            from_chain="ethereum",
            to_chain="stellar",
            from_asset="USDC",
            to_asset="XLM",
            from_amount=240,
            to_amount=100,
            created_at=datetime.now(timezone.utc) - timedelta(minutes=5),
        )

        result = MagicMock()
        result.scalars.return_value.all.return_value = [better_price, older_same_price]
        db = AsyncMock()
        db.execute = AsyncMock(return_value=result)

        summary = await service.match_order(db, taker)

        assert summary.total_matches == 1
        assert summary.filled_amount == 100
        assert taker.status == "filled"
        assert older_same_price.filled_amount == 240
        assert better_price.filled_amount == 0

    @pytest.mark.anyio
    async def test_skips_incompatible_price(self):
        service = OrderMatchingService()
        taker = make_order(from_amount=100, to_amount=200)
        incompatible = make_order(
            creator="0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
            from_chain="ethereum",
            to_chain="stellar",
            from_asset="USDC",
            to_asset="XLM",
            from_amount=150,
            to_amount=100,
        )

        result = MagicMock()
        result.scalars.return_value.all.return_value = [incompatible]
        db = AsyncMock()
        db.execute = AsyncMock(return_value=result)

        summary = await service.match_order(db, taker)

        assert summary.total_matches == 0
        assert taker.status == "open"
