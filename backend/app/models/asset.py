import uuid
from sqlalchemy import Column, String, Integer, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin


class Asset(Base, TimestampMixin):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chain = Column(String, nullable=False, index=True)  # e.g., "stellar", "bitcoin", "ethereum"
    address = Column(String, nullable=True, index=True)  # contract address or asset code
    symbol = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    decimals = Column(Integer, nullable=True)  # for tokens with decimals
    description = Column(Text, nullable=True)
    icon_url = Column(String, nullable=True)
    website_url = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False, index=True)
    is_active = Column(Boolean, default=True, index=True)
    tags = Column(String, nullable=True)  # comma-separated tags

    def __repr__(self):
        return f"<Asset(id={self.id}, chain={self.chain}, symbol={self.symbol})>"