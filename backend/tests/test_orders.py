"""Tests for order schemas and matching."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.models.order import SwapOrder
from app.schemas.order import OrderAmend, OrderCreate, OrderResponse
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
        "amendment_count": 0,
        "amendment_log": [],
        "trigger_price": None,
        "valid_from": None,
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
        assert resp.amendment_count == 0
        assert resp.amendment_log == []

    def test_order_response_includes_amendment_fields(self):
        log_entry = {
            "sequence": 1,
            "amended_at": "2026-06-01T10:00:00+00:00",
            "changes": {"from_amount": {"before": 50, "after": 100}},
        }
        data = {
            "id": "order-002",
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
            "amendment_count": 1,
            "amendment_log": [log_entry],
        }
        resp = OrderResponse(**data)
        assert resp.amendment_count == 1
        assert len(resp.amendment_log) == 1
        assert resp.amendment_log[0]["sequence"] == 1


class TestOrderAmendSchema:
    def test_valid_amend_single_field(self):
        data = OrderAmend(from_amount=500)
        assert data.from_amount == 500
        assert data.to_amount is None

    def test_valid_amend_multiple_fields(self):
        data = OrderAmend(from_amount=300, to_amount=600, note="repriced")
        assert data.from_amount == 300
        assert data.to_amount == 600
        assert data.note == "repriced"

    def test_rejects_zero_fields_changed(self):
        with pytest.raises(ValueError, match="At least one amendable field must be provided"):
            OrderAmend()

    def test_rejects_zero_amounts(self):
        with pytest.raises(ValueError):
            OrderAmend(from_amount=0)

    def test_expiry_amend(self):
        data = OrderAmend(expiry=9999999999)
        assert data.expiry == 9999999999


class TestAmendOrderLogic:
    def test_amendment_increments_count(self):
        order = make_order()
        assert order.amendment_count == 0

        order.from_amount = 150
        order.amendment_count = order.amendment_count + 1
        entry = {
            "sequence": 1,
            "amended_at": datetime.now(timezone.utc).isoformat(),
            "changes": {"from_amount": {"before": 100, "after": 150}},
        }
        order.amendment_log = list(order.amendment_log) + [entry]

        assert order.amendment_count == 1
        assert len(order.amendment_log) == 1
        assert order.amendment_log[0]["sequence"] == 1

    def test_multiple_amendments_append_in_order(self):
        order = make_order()
        now = datetime.now(timezone.utc)

        for i in range(1, 4):
            order.amendment_count = i
            entry = {
                "sequence": i,
                "amended_at": now.isoformat(),
                "changes": {"from_amount": {"before": i * 10, "after": (i + 1) * 10}},
            }
            order.amendment_log = list(order.amendment_log) + [entry]

        assert order.amendment_count == 3
        assert [e["sequence"] for e in order.amendment_log] == [1, 2, 3]

    def test_no_changes_does_not_amend(self):
        order = make_order(from_amount=100)
        amend = OrderAmend(from_amount=100, to_amount=200)
        changes = {}
        if amend.from_amount is not None and amend.from_amount != order.from_amount:
            changes["from_amount"] = {"before": order.from_amount, "after": amend.from_amount}
        if amend.to_amount is not None and amend.to_amount != order.to_amount:
            changes["to_amount"] = {"before": order.to_amount, "after": amend.to_amount}
        assert changes == {}


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


class TestAdvancedOrderConditions:
    """Tests for trigger_price and valid_from execution conditions."""

    # --- Schema validation ---

    def test_order_create_accepts_trigger_price_and_valid_from(self):
        now = int(datetime.now(timezone.utc).timestamp())
        data = OrderCreate(
            creator="GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
            from_chain="stellar",
            to_chain="ethereum",
            from_asset="XLM",
            to_asset="USDC",
            from_amount=100,
            to_amount=200,
            expiry=now + 3600,
            trigger_price=Decimal("1.5"),
            valid_from=now + 60,
        )
        assert data.trigger_price == Decimal("1.5")
        assert data.valid_from == now + 60

    def test_order_create_rejects_valid_from_after_expiry(self):
        now = int(datetime.now(timezone.utc).timestamp())
        with pytest.raises(ValueError, match="valid_from must be earlier than expiry"):
            OrderCreate(
                creator="GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
                from_chain="stellar",
                to_chain="ethereum",
                from_asset="XLM",
                to_asset="USDC",
                from_amount=100,
                to_amount=200,
                expiry=now + 3600,
                valid_from=now + 7200,
            )

    def test_order_create_rejects_valid_from_equal_to_expiry(self):
        now = int(datetime.now(timezone.utc).timestamp())
        expiry = now + 3600
        with pytest.raises(ValueError, match="valid_from must be earlier than expiry"):
            OrderCreate(
                creator="GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
                from_chain="stellar",
                to_chain="ethereum",
                from_asset="XLM",
                to_asset="USDC",
                from_amount=100,
                to_amount=200,
                expiry=expiry,
                valid_from=expiry,
            )

    def test_order_create_rejects_zero_trigger_price(self):
        now = int(datetime.now(timezone.utc).timestamp())
        with pytest.raises(ValueError):
            OrderCreate(
                creator="GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
                from_chain="stellar",
                to_chain="ethereum",
                from_asset="XLM",
                to_asset="USDC",
                from_amount=100,
                to_amount=200,
                expiry=now + 3600,
                trigger_price=Decimal("0"),
            )

    def test_order_amend_accepts_trigger_price_and_valid_from(self):
        now = int(datetime.now(timezone.utc).timestamp())
        data = OrderAmend(trigger_price=Decimal("2.5"), valid_from=now + 120)
        assert data.trigger_price == Decimal("2.5")
        assert data.valid_from == now + 120

    def test_order_amend_rejects_all_none_including_new_fields(self):
        with pytest.raises(ValueError, match="At least one amendable field must be provided"):
            OrderAmend()

    def test_order_response_exposes_new_fields(self):
        resp = OrderResponse(
            id="order-adv-001",
            creator="GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
            from_chain="stellar",
            to_chain="ethereum",
            from_asset="XLM",
            to_asset="USDC",
            from_amount=100,
            to_amount=200,
            filled_amount=0,
            expiry=9999999999,
            status="open",
            trigger_price=Decimal("1.8"),
            valid_from=1700000000,
        )
        assert resp.trigger_price == Decimal("1.8")
        assert resp.valid_from == 1700000000

    # --- Matching: valid_from window ---

    @pytest.mark.anyio
    async def test_taker_not_yet_active_skips_matching(self):
        """Taker with future valid_from should not be matched."""
        service = OrderMatchingService()
        future_ts = int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp())
        taker = make_order(from_amount=100, to_amount=200, valid_from=future_ts)
        candidate = make_order(
            creator="0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
            from_chain="ethereum",
            to_chain="stellar",
            from_asset="USDC",
            to_asset="XLM",
            from_amount=200,
            to_amount=100,
        )

        result = MagicMock()
        result.scalars.return_value.all.return_value = [candidate]
        db = AsyncMock()
        db.execute = AsyncMock(return_value=result)

        summary = await service.match_order(db, taker)

        assert summary.total_matches == 0
        assert taker.status == "open"

    @pytest.mark.anyio
    async def test_candidate_not_yet_active_is_skipped(self):
        """Candidate with future valid_from should be skipped."""
        service = OrderMatchingService()
        future_ts = int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp())
        taker = make_order(from_amount=100, to_amount=200)
        candidate = make_order(
            creator="0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
            from_chain="ethereum",
            to_chain="stellar",
            from_asset="USDC",
            to_asset="XLM",
            from_amount=200,
            to_amount=100,
            valid_from=future_ts,
        )

        result = MagicMock()
        result.scalars.return_value.all.return_value = [candidate]
        db = AsyncMock()
        db.execute = AsyncMock(return_value=result)

        summary = await service.match_order(db, taker)

        assert summary.total_matches == 0
        assert taker.status == "open"

    @pytest.mark.anyio
    async def test_order_within_valid_window_matches(self):
        """Orders with valid_from in the past should match normally."""
        service = OrderMatchingService()
        past_ts = int((datetime.now(timezone.utc) - timedelta(minutes=5)).timestamp())
        taker = make_order(from_amount=100, to_amount=200, valid_from=past_ts)
        candidate = make_order(
            creator="0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
            from_chain="ethereum",
            to_chain="stellar",
            from_asset="USDC",
            to_asset="XLM",
            from_amount=200,
            to_amount=100,
            valid_from=past_ts,
        )

        result = MagicMock()
        result.scalars.return_value.all.return_value = [candidate]
        db = AsyncMock()
        db.execute = AsyncMock(return_value=result)

        summary = await service.match_order(db, taker)

        assert summary.total_matches == 1
        assert taker.status == "filled"

    # --- Matching: trigger_price ---

    @pytest.mark.anyio
    async def test_taker_trigger_price_met_allows_match(self):
        """Match proceeds when execution price meets taker's trigger_price."""
        service = OrderMatchingService()
        # taker sends 100 XLM, wants 200 USDC => execution price 2.0 USDC/XLM
        # trigger_price = 2.0 — exactly met
        taker = make_order(from_amount=100, to_amount=200, trigger_price=Decimal("2.0"))
        candidate = make_order(
            creator="0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
            from_chain="ethereum",
            to_chain="stellar",
            from_asset="USDC",
            to_asset="XLM",
            from_amount=200,
            to_amount=100,
        )

        result = MagicMock()
        result.scalars.return_value.all.return_value = [candidate]
        db = AsyncMock()
        db.execute = AsyncMock(return_value=result)

        summary = await service.match_order(db, taker)

        assert summary.total_matches == 1
        assert taker.status == "filled"

    @pytest.mark.anyio
    async def test_taker_trigger_price_not_met_skips_match(self):
        """Match is skipped when execution price is below taker's trigger_price."""
        service = OrderMatchingService()
        # taker sends 100 XLM, wants 200 USDC => execution price 2.0 USDC/XLM
        # trigger_price = 2.5 — not met
        taker = make_order(from_amount=100, to_amount=200, trigger_price=Decimal("2.5"))
        candidate = make_order(
            creator="0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
            from_chain="ethereum",
            to_chain="stellar",
            from_asset="USDC",
            to_asset="XLM",
            from_amount=200,
            to_amount=100,
        )

        result = MagicMock()
        result.scalars.return_value.all.return_value = [candidate]
        db = AsyncMock()
        db.execute = AsyncMock(return_value=result)

        summary = await service.match_order(db, taker)

        assert summary.total_matches == 0
        assert taker.status == "open"

    @pytest.mark.anyio
    async def test_candidate_trigger_price_not_met_skips_match(self):
        """Match is skipped when execution price is below the candidate's trigger_price."""
        service = OrderMatchingService()
        # candidate sends 200 USDC, wants 100 XLM => maker exec price = 100/200 = 0.5 XLM/USDC
        # candidate's trigger_price = 1.0 — not met
        taker = make_order(from_amount=100, to_amount=200)
        candidate = make_order(
            creator="0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
            from_chain="ethereum",
            to_chain="stellar",
            from_asset="USDC",
            to_asset="XLM",
            from_amount=200,
            to_amount=100,
            trigger_price=Decimal("1.0"),
        )

        result = MagicMock()
        result.scalars.return_value.all.return_value = [candidate]
        db = AsyncMock()
        db.execute = AsyncMock(return_value=result)

        summary = await service.match_order(db, taker)

        assert summary.total_matches == 0
        assert taker.status == "open"

    # --- Partial-fill preservation ---

    @pytest.mark.anyio
    async def test_min_fill_amount_preserved_alongside_trigger_price(self):
        """min_fill_amount enforcement still applies when trigger_price is set."""
        service = OrderMatchingService()
        # taker wants 200 USDC for 100 XLM with trigger_price=2.0, min_fill=80
        # candidate only fills 50 XLM, counterparty_fill = 100 USDC < min_fill 80 of taker
        taker = make_order(
            from_amount=100,
            to_amount=200,
            min_fill_amount=80,
            trigger_price=Decimal("2.0"),
        )
        candidate = make_order(
            creator="0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae",
            from_chain="ethereum",
            to_chain="stellar",
            from_asset="USDC",
            to_asset="XLM",
            from_amount=100,
            to_amount=50,
        )

        result = MagicMock()
        result.scalars.return_value.all.return_value = [candidate]
        db = AsyncMock()
        db.execute = AsyncMock(return_value=result)

        summary = await service.match_order(db, taker)

        assert summary.total_matches == 0
        assert taker.status == "open"
