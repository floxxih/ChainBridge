import uuid
from enum import Enum as PyEnum
from sqlalchemy import Column, String, BigInteger, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin

class OrderStatus(str, PyEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class SwapOrder(Base, TimestampMixin):
    __tablename__ = "swap_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_address = Column(String, nullable=False, index=True)
    source_chain = Column(String, nullable=False)
    target_chain = Column(String, nullable=False)
    source_asset = Column(String, nullable=False)
    target_asset = Column(String, nullable=False)
    amount = Column(BigInteger, nullable=False)
    status = Column(SQLEnum(OrderStatus), nullable=False, default=OrderStatus.PENDING)