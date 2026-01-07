# backend/app/config.py
"""
Application configuration using Pydantic Settings.
All sensitive values loaded from environment variables.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings with validation."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # === APP ===
    app_name: str = "VISUALify API"
    debug: bool = False
    environment: str = "development"

    # === DATABASE ===
    database_url: str  # postgresql+asyncpg://user:pass@host:5432/db

    # === REDIS ===
    redis_url: str = "redis://localhost:6379"

    # === SPOTIFY OAUTH ===
    spotify_client_id: str
    spotify_client_secret: str
    spotify_redirect_uri: str = "http://localhost:3000/api/auth/callback/spotify"

    # === SECURITY: Token Encryption ===
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    encryption_key: str

    # === SECURITY: JWT ===
    # Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24 hours (NOT 7 days)

    # === FRONTEND ===
    frontend_url: str = "http://localhost:3000"
    
    # === POLLING ===
    poll_interval_playing: int = 3  # seconds when music is playing
    poll_interval_idle: int = 10    # seconds when nothing playing

    # === SESSION ===
    session_gap_minutes: int = 30  # Gap to start new listening session

    @field_validator("encryption_key")
    @classmethod
    def validate_fernet_key(cls, v: str) -> str:
        """Validate that encryption_key is a valid Fernet key."""
        if len(v) != 44:
            raise ValueError(
                "ENCRYPTION_KEY must be a valid Fernet key (44 characters). "
                "Generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        return v

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        """Validate JWT secret is sufficiently long."""
        if len(v) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters")
        return v

    @property
    def allowed_origins(self) -> list[str]:
        """Get list of allowed CORS origins."""
        origins = [self.frontend_url]
        if self.debug:
            origins.extend([
                "http://localhost:3000",
                "http://127.0.0.1:3000",
            ])
        return origins


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
