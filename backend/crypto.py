"""
Handles two-way encryption of portal credentials stored in the database.
Uses Fernet symmetric encryption — the key lives in .env (CREDENTIAL_ENCRYPTION_KEY).

To generate a key:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""
from cryptography.fernet import Fernet, InvalidToken
import os
from dotenv import load_dotenv

load_dotenv()

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = os.environ.get("CREDENTIAL_ENCRYPTION_KEY")
        if not key:
            raise RuntimeError(
                "CREDENTIAL_ENCRYPTION_KEY is not set in .env.\n"
                "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        _fernet = Fernet(key.encode())
    return _fernet


def encrypt(value: str | None) -> str | None:
    if not value:
        return value
    return _get_fernet().encrypt(value.encode()).decode()


def decrypt(value: str | None) -> str | None:
    if not value:
        return value
    try:
        return _get_fernet().decrypt(value.encode()).decode()
    except (InvalidToken, Exception):
        return None
