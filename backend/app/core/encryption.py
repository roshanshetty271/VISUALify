# backend/app/core/encryption.py
"""
Fernet encryption for Spotify tokens at rest.

If database is breached, tokens are useless without ENCRYPTION_KEY.
"""
from cryptography.fernet import Fernet, InvalidToken
import logging

logger = logging.getLogger(__name__)

# Lazy initialization to avoid import-time settings access
_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    """Get or initialize Fernet cipher."""
    global _fernet
    if _fernet is None:
        from app.config import get_settings
        settings = get_settings()
        _fernet = Fernet(settings.encryption_key.encode())
    return _fernet


def encrypt_token(token: str) -> str:
    """
    Encrypt a plaintext token for database storage.
    
    Args:
        token: Plaintext Spotify access or refresh token
        
    Returns:
        Base64-encoded encrypted token
    """
    if not token:
        return ""
    return _get_fernet().encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str | None:
    """
    Decrypt an encrypted token from database.
    
    Args:
        encrypted_token: Base64-encoded encrypted token
        
    Returns:
        Plaintext token, or None if decryption fails
    """
    if not encrypted_token:
        return None
    try:
        return _get_fernet().decrypt(encrypted_token.encode()).decode()
    except InvalidToken:
        logger.error("Failed to decrypt token - key mismatch or corrupted data")
        return None
