"""Tests for dispute schemas (#62)."""

import pytest
from pydantic import ValidationError

from app.schemas.dispute import (
    DisputeCreate,
    DisputeEvidenceCreate,
    DisputeResolve,
    DisputeReview,
)


def test_dispute_create_valid():
    data = DisputeCreate(
        swap_id="f2f9bcdc-9f85-4f56-9d6f-a57de0fdad83",
        submitted_by="GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
        category="timeout",
        reason="Counterparty did not complete second leg after lock period.",
        priority="high",
        evidence=[{"type": "tx_hash", "value": "0xabc123"}],
    )
    assert data.category == "timeout"
    assert data.priority == "high"
    assert len(data.evidence) == 1


def test_dispute_create_rejects_short_reason():
    with pytest.raises(ValidationError):
        DisputeCreate(
            swap_id="f2f9bcdc-9f85-4f56-9d6f-a57de0fdad83",
            submitted_by="user",
            category="other",
            reason="short",
        )


def test_dispute_evidence_requires_items():
    with pytest.raises(ValidationError):
        DisputeEvidenceCreate(evidence=[])


def test_dispute_review_requires_notes():
    with pytest.raises(ValidationError):
        DisputeReview(status="in_review", reviewed_by="admin", admin_notes="")


def test_dispute_resolve_refund_payload():
    payload = DisputeResolve(
        status="refunded",
        resolution_action="refund_override",
        resolution="Refunded due to confirmed counterparty fault.",
        resolved_by="admin_key_1",
        refund_override=True,
        refund_amount=100000,
    )
    assert payload.status == "refunded"
    assert payload.refund_override is True
    assert payload.refund_amount == 100000
