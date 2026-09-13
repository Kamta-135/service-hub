"""
Auth building blocks: OTP hashing, JWT access/refresh tokens, and FastAPI
dependencies that resolve + authorize the current user.

SECRET_KEY must be overridden via env var in any real deployment — the
default here is only for local dev and is intentionally obvious about it.
"""
import os
import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Role

SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-insecure-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 30
REFRESH_TOKEN_DAYS = 30

if os.getenv("ENV") == "production" and SECRET_KEY == "dev-only-insecure-secret-change-me":
    raise RuntimeError(
        "Refusing to start with the default SECRET_KEY in production. "
        "Set a real, random SECRET_KEY env var (e.g. `openssl rand -hex 32`)."
    )

bearer_scheme = HTTPBearer(auto_error=False)


# ---------- OTP ----------

def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(phone: str, code: str) -> str:
    # Bind the hash to the phone number so a leaked code for one number
    # can't be replayed against another.
    msg = f"{phone}:{code}".encode()
    return hmac.new(SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()


def verify_otp_hash(phone: str, code: str, code_hash: str) -> bool:
    return hmac.compare_digest(hash_otp(phone, code), code_hash)


# ---------- JWT ----------

def _create_token(sub: str, role: str, expires_delta: timedelta, token_type: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,
        "role": role,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(user: User) -> str:
    return _create_token(user.id, user.role.value, timedelta(minutes=ACCESS_TOKEN_MINUTES), "access")


def create_refresh_token(user: User) -> str:
    return _create_token(user.id, user.role.value, timedelta(days=REFRESH_TOKEN_DAYS), "refresh")


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


# ---------- Dependencies ----------

def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_token(creds.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expected an access token")

    user = db.get(User, payload.get("sub"))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")
    return user


def require_role(*allowed: Role):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires role: {[r.value for r in allowed]}",
            )
        return user
    return dependency
