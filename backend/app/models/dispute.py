import uuid
from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    BigInteger,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID

from .base import Base, TimestampMixin


class SwapDispute(Base, TimestampMixin):
    __tablename__ = "swap_disputes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    swap_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cross_chain_swaps.id"),
        nullable=False,
        index=True,
    )
    submitted_by = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="submitted", index=True)
    priority = Column(String, nullable=False, default="normal")

    # Evidence payloads (URLs, tx hashes, screenshots metadata, notes)
    evidence = Column(JSON, nullable=False, default=list)

    # Resolution workflow
    admin_notes = Column(Text, nullable=True)
    resolution = Column(Text, nullable=True)
    resolution_action = Column(String, nullable=True)
    refund_override = Column(Boolean, nullable=False, default=False)
    refund_amount = Column(BigInteger, nullable=True)

    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(String, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Full append-only action history for transparency/auditability
    action_log = Column(JSON, nullable=False, default=list)
