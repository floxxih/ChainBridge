import uuid
from sqlalchemy import Column, String, BigInteger, Float, DateTime, func, Index
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin


class LiquidityPoolSnapshot(Base, TimestampMixin):
    """Point-in-time record of a pool's reserves, used to track drift over time."""

    __tablename__ = "liquidity_pool_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pool_id = Column(BigInteger, nullable=False, index=True)
    asset_a = Column(String, nullable=False)
    asset_b = Column(String, nullable=False)
    reserve_a = Column(BigInteger, nullable=False)
    reserve_b = Column(BigInteger, nullable=False)
    # ratio = reserve_a / reserve_b; stored as float for fast comparisons
    ratio = Column(Float, nullable=True)
    captured_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    __table_args__ = (
        Index("ix_pool_snapshots_pool_captured", "pool_id", "captured_at"),
    )


class LiquidityPoolHealth(Base):
    """Latest computed health record for each tracked pool."""

    __tablename__ = "liquidity_pool_health"

    pool_id = Column(BigInteger, primary_key=True)
    asset_a = Column(String, nullable=False)
    asset_b = Column(String, nullable=False)
    reserve_a = Column(BigInteger, nullable=False)
    reserve_b = Column(BigInteger, nullable=False)
    ratio = Column(Float, nullable=True)
    # Percentage change in ratio since the oldest snapshot in the monitoring window
    ratio_drift_pct = Column(Float, nullable=True)
    # healthy | warning | critical
    status = Column(String, nullable=False, default="healthy")
    last_checked_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
