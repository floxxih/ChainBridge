from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "ChainBridge"
    debug: bool = False

    # Database
    database_url: str = (
        "postgresql+asyncpg://chainbridge:password@localhost:5432/chainbridge"
    )

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60

    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60

    # Email
    email_enabled: bool = False
    email_provider: str = "sendgrid"  # sendgrid or ses
    sendgrid_api_key: str = ""
    ses_access_key: str = ""
    ses_secret_key: str = ""
    ses_region: str = "us-east-1"
    email_from: str = "noreply@chainbridge.io"
    email_from_name: str = "ChainBridge"

    @field_validator("debug", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production", "false", "0", "off"}:
                return False
            if normalized in {"debug", "dev", "development", "true", "1", "on"}:
                return True
        return value

    class Config:
        env_file = ".env"


settings = Settings()
