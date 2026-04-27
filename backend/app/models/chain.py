import uuid
from sqlalchemy import Column, String, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin


class ChainConfig(Base, TimestampMixin):
    __tablename__ = "chain_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chain_id = Column(String, unique=True, nullable=False, index=True)
    chain_name = Column(String, nullable=False)
    chain_type = Column(String, nullable=False)          # "evm", "bitcoin", "stellar", "solana"
    network = Column(String, nullable=False)             # "mainnet", "testnet"
    confirmations_required = Column(Integer, nullable=False, default=1)
    native_currency_symbol = Column(String, nullable=False)
    explorer_url = Column(String, nullable=True)
    rpc_url = Column(String, nullable=True)
    is_enabled = Column(Boolean, nullable=False, default=True)
    max_fee_per_tx = Column(String, nullable=True)
    status = Column(String, nullable=False, default="active")  # "active", "degraded", "offline"
