import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Role, ProviderProfile
from app.schemas import OtpRequestIn, OtpVerifyIn, RefreshIn, TokenOut, UserOut
from app.services import auth_service
from app.security import create_access_token, create_refresh_token, decode_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

# TEMPORARY: lets people in without going through OTP, while SMS delivery
# isn't wired up yet. Every call creates a brand-new demo user — there's no
# real identity behind it. Set ALLOW_GUEST_LOGIN=false (or just delete this
# endpoint) once real SMS is live; nothing else in the app depends on it.
GUEST_LOGIN_ENABLED = os.getenv("ALLOW_GUEST_LOGIN", "true").lower() != "false"


@router.post("/guest", response_model=TokenOut)
async def guest_login(role: Role = Role.CUSTOMER, db: Session = Depends(get_db)):
    if not GUEST_LOGIN_ENABLED:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Guest login is disabled.")

    guest_phone = f"guest-{uuid.uuid4().hex[:10]}"
    user = User(phone=guest_phone, name="Guest", role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    if role == Role.PROVIDER:
        db.add(ProviderProfile(user_id=user.id))
        db.commit()

    return TokenOut(
        access_token=create_access_token(user),
        refresh_token=create_refresh_token(user),
        user=UserOut.model_validate(user),
    )


@router.post("/otp/request")
async def request_otp(payload: OtpRequestIn, db: Session = Depends(get_db)):
    """Send (or in dev, return) a one-time code for this phone number."""
    return auth_service.request_otp(db, payload.phone)


@router.post("/otp/verify", response_model=TokenOut)
async def verify_otp(payload: OtpVerifyIn, db: Session = Depends(get_db)):
    """
    Verify the code. Creates the user on first login (role fixed at
    that point), then returns an access + refresh token pair.
    """
    user = auth_service.verify_otp(db, payload.phone, payload.code, payload.role, payload.name)
    return TokenOut(
        access_token=create_access_token(user),
        refresh_token=create_refresh_token(user),
        user=UserOut.model_validate(user),
    )


@router.post("/refresh", response_model=TokenOut)
async def refresh_token(payload: RefreshIn, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a new access + refresh pair."""
    claims = decode_token(payload.refresh_token)
    if claims.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expected a refresh token")

    user = db.get(User, claims.get("sub"))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")

    return TokenOut(
        access_token=create_access_token(user),
        refresh_token=create_refresh_token(user),
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
async def read_current_user(user: User = Depends(get_current_user)):
    return user
