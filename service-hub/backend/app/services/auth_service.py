"""
Auth business logic.
"""
import logging
import os
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import User, OtpCode, Role, ProviderProfile
from app.security import generate_otp, hash_otp, verify_otp_hash
from app.rate_limiter import check_and_record
from app.sms import send_otp_sms

logger = logging.getLogger("service_hub.auth")

OTP_TTL_MINUTES = 5
MAX_OTP_ATTEMPTS = 5
MAX_REQUESTS_PER_WINDOW = 3
WINDOW_MINUTES = 10

# TEMPORARY: while real SMS delivery isn't wired up, set ALLOW_ANY_OTP=true
# to accept any 6-digit code (so testers can log in without ever seeing the
# actual SMS). An OTP still has to have been requested first — this only
# skips checking that the digits match. Set to "false" (or unset) once SMS
# is live so the real code is required again — nothing else needs to change.
ALLOW_ANY_OTP = os.getenv("ALLOW_ANY_OTP", "false").lower() == "true"


def _rate_limit(phone: str) -> None:
    ok = check_and_record(f"otp:{phone}", MAX_REQUESTS_PER_WINDOW, WINDOW_MINUTES * 60)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Try again in a few minutes.",
        )


def request_otp(db: Session, phone: str) -> dict:
    _rate_limit(phone)

    code = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)

    otp = OtpCode(phone=phone, code_hash=hash_otp(phone, code), expires_at=expires_at)
    db.add(otp)
    db.commit()

    sent = send_otp_sms(phone, code)
    if not sent:
        logger.warning(f"send_otp_sms returned False for {phone} — OTP created but may not have been delivered")

    result = {"message": "OTP sent", "expires_in_seconds": OTP_TTL_MINUTES * 60}
    if os.getenv("ENV", "development") != "production":
        result["dev_otp"] = code  # never included outside dev/local
    return result


def verify_otp(db: Session, phone: str, code: str, role: Role, name: str | None) -> User:
    otp = (
        db.query(OtpCode)
        .filter(OtpCode.phone == phone, OtpCode.consumed.is_(False))
        .order_by(OtpCode.created_at.desc())
        .first()
    )
    if not otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No pending OTP for this number")

    now = datetime.now(timezone.utc)
    expires_at = otp.expires_at if otp.expires_at.tzinfo else otp.expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has expired, request a new one")

    if otp.attempts >= MAX_OTP_ATTEMPTS:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many incorrect attempts")

    code_is_valid = (
        (len(code) == 6 and code.isdigit())
        if ALLOW_ANY_OTP
        else verify_otp_hash(phone, code, otp.code_hash)
    )
    if not code_is_valid:
        otp.attempts += 1
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect OTP")

    otp.consumed = True
    db.commit()

    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        user = User(phone=phone, name=name, role=role)
        db.add(user)
        db.commit()
        db.refresh(user)
        if role == Role.PROVIDER:
            db.add(ProviderProfile(user_id=user.id))
            db.commit()

    return user
