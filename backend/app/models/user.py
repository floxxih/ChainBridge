import uuid

from sqlalchemy import Boolean, Column, String
from sqlalchemy.dialects.postgresql import UUID

from .base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_address = Column(String, nullable=False, unique=True, index=True)
    display_name = Column(String, nullable=True)
    preferred_chain = Column(String, nullable=True)
    email = Column(String, nullable=True)
    notifications_enabled = Column(Boolean, default=True)
    theme = Column(String, default="dark")
    is_active = Column(Boolean, nullable=False, default=True, index=True)
