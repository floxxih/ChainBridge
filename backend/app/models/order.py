import uuid
from sqlalchemy import Column, String, BigInteger, Integer, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from .base import Base, TimestampMixin


class SwapOrder(Base, TimestampMixin):
    __tablename__ = "swap_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    onchain_id = Column(Integer, unique=True, index=True)
    creator = Column(String, nullable=False, index=True)
    creator_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    counterparty_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    from_chain = Column(String, nullable=False)
    to_chain = Column(String, nullable=False)
    from_asset = Column(String, nullable=False)
    to_asset = Column(String, nullable=False)
    from_amount = Column(BigInteger, nullable=False)
    to_amount = Column(BigInteger, nullable=False)
    min_fill_amount = Column(BigInteger, nullable=True)
    filled_amount = Column(BigInteger, default=0)
    expiry = Column(BigInteger, nullable=False, index=True)
    status = Column(String, nullable=False, default="open", index=True)
    counterparty = Column(String, nullable=True)
    amendment_count = Column(Integer, nullable=False, default=0)
    amendment_log = Column(JSONB, nullable=False, default=list)
    trigger_price = Column(Numeric(36, 18), nullable=True)
    valid_from = Column(BigInteger, nullable=True, index=True)
