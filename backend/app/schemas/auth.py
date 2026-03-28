from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class APIKeyCreate(BaseModel):
    name: str
    owner: str
    is_admin: bool = False


class APIKeyResponse(BaseModel):
    id: str
    key: str
    name: str
    owner: str
    is_active: bool
    is_admin: bool = False
    request_count: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
