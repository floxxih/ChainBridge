import uuid
from sqlalchemy import Column, String, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin

class HTLC(Base, TimestampMixin):
    __tablename__ = "htlcs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    onchain_id = Column(String, unique=True, index=True)
    sender = Column(String, nullable=False, index=True)
    receiver = Column(String, nullable=False, index=True)
    amount = Column(BigInteger, nullable=False)
    hash_lock = Column(String, nullable=False)
    time_lock = Column(BigInteger, nullable=False)
    status = Column(String, nullable=False, default="active")
    secret = Column(String, nullable=True)
    hash_algorithm = Column(String, nullable=False, default="sha256")