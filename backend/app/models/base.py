import uuid
from sqlalchemy.orm import declarative_base # Changed this line
from sqlalchemy import Column, DateTime, func
from sqlalchemy.dialects.postgresql import UUID

# Use the function call to create the Base
Base = declarative_base()

class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())