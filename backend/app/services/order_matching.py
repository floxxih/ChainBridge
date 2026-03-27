"""Order matching helpers for reciprocal cross-chain orders."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from fractions import Fraction

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import SwapOrder


def _remaining(order: SwapOrder) -> int:
    return max(int(order.from_amount) - int(order.filled_amount or 0), 0)


def _is_expired(order: SwapOrder) -> bool:
    return int(order.expiry) <= int(datetime.now(timezone.utc).timestamp())


def _counterparty_label(existing: str | None, new_value: str) -> str:
    if not existing or existing == new_value:
        return new_value
    return "multiple"


@dataclass
class MatchExecution:
    order_id: str
    counterparty_id: str
    fill_amount: int
    counterparty_fill_amount: int
    execution_price: float


@dataclass
class MatchingSummary:
    total_matches: int
    filled_amount: int
    received_amount: int
    remaining_amount: int
    status: str
    matches: list[MatchExecution]

    def to_event_payload(self) -> dict:
        avg_execution_price = (
            self.received_amount / self.filled_amount if self.filled_amount else 0.0
        )
        return {
            "match_count": self.total_matches,
            "filled_amount": self.filled_amount,
            "received_amount": self.received_amount,
            "remaining_amount": self.remaining_amount,
            "avg_execution_price": avg_execution_price,
            "status": self.status,
            "matches": [
                {
                    "order_id": match.order_id,
                    "counterparty_id": match.counterparty_id,
                    "fill_amount": match.fill_amount,
                    "counterparty_fill_amount": match.counterparty_fill_amount,
                    "execution_price": match.execution_price,
                }
                for match in self.matches
            ],
        }


class OrderMatchingService:
    """Price-time-priority matcher for reciprocal open orders."""

    async def match_order(self, db: AsyncSession, order: SwapOrder) -> MatchingSummary:
        if order.status not in {"open", "matched"} or _is_expired(order):
            return MatchingSummary(
                total_matches=0,
                filled_amount=int(order.filled_amount or 0),
                received_amount=0,
                remaining_amount=_remaining(order),
                status=order.status,
                matches=[],
            )

        result = await db.execute(
            select(SwapOrder)
            .where(
                SwapOrder.id != order.id,
                SwapOrder.status.in_(("open", "matched")),
                SwapOrder.from_chain == order.to_chain,
                SwapOrder.to_chain == order.from_chain,
                SwapOrder.from_asset == order.to_asset,
                SwapOrder.to_asset == order.from_asset,
            )
            .order_by(SwapOrder.created_at.asc())
        )
        candidates = result.scalars().all()

        matches: list[MatchExecution] = []
        received_amount = 0

        def candidate_price_key(candidate: SwapOrder) -> Fraction:
            return Fraction(int(candidate.from_amount), int(candidate.to_amount))

        for candidate in sorted(
            candidates,
            key=lambda current: (
                -candidate_price_key(current),
                current.created_at or datetime.min,
            ),
        ):
            if _remaining(order) <= 0:
                break
            if _remaining(candidate) <= 0 or _is_expired(candidate):
                continue
            if not self._is_price_compatible(order, candidate):
                continue

            max_fill = self._max_fill_amount(order, candidate)
            if max_fill <= 0:
                continue

            counterparty_fill = (max_fill * int(candidate.from_amount)) // int(
                candidate.to_amount
            )
            if counterparty_fill <= 0:
                continue

            if order.min_fill_amount and max_fill < int(order.min_fill_amount):
                continue
            if candidate.min_fill_amount and counterparty_fill < int(
                candidate.min_fill_amount
            ):
                continue

            order.filled_amount = int(order.filled_amount or 0) + max_fill
            candidate.filled_amount = (
                int(candidate.filled_amount or 0) + counterparty_fill
            )
            order.counterparty = _counterparty_label(
                order.counterparty, candidate.creator
            )
            candidate.counterparty = _counterparty_label(
                candidate.counterparty, order.creator
            )

            order.status = "filled" if _remaining(order) == 0 else "matched"
            candidate.status = "filled" if _remaining(candidate) == 0 else "matched"

            received_amount += counterparty_fill
            matches.append(
                MatchExecution(
                    order_id=str(order.id),
                    counterparty_id=str(candidate.id),
                    fill_amount=max_fill,
                    counterparty_fill_amount=counterparty_fill,
                    execution_price=counterparty_fill / max_fill,
                )
            )

        return MatchingSummary(
            total_matches=len(matches),
            filled_amount=int(order.filled_amount or 0),
            received_amount=received_amount,
            remaining_amount=_remaining(order),
            status=order.status,
            matches=matches,
        )

    def _is_price_compatible(
        self, taker_order: SwapOrder, maker_order: SwapOrder
    ) -> bool:
        taker_limit = Fraction(int(taker_order.to_amount), int(taker_order.from_amount))
        maker_offer = Fraction(int(maker_order.from_amount), int(maker_order.to_amount))
        return maker_offer >= taker_limit

    def _max_fill_amount(self, taker_order: SwapOrder, maker_order: SwapOrder) -> int:
        taker_remaining = _remaining(taker_order)
        maker_remaining = _remaining(maker_order)
        maker_capacity = (maker_remaining * int(maker_order.to_amount)) // int(
            maker_order.from_amount
        )
        return min(taker_remaining, maker_capacity)
