"""
Admin stats — read-only aggregate counts for a dashboard.

Locked via ADMIN_PHONES (comma-separated phone numbers, e.g.
"+919876500001,+919876500002") rather than a DB role — there's no
Role.ADMIN yet since the OTP-registration flow only lets people sign up
as customer/provider, so admin access can't be self-granted. Anyone
whose verified phone number is in that list gets access; everyone else
gets 403. Set ADMIN_PHONES in your deployment env before going live —
if it's unset, this endpoint is closed to everyone (fails safe).
"""
import os

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Role, ServiceRequest, RequestStatus, Priority, ProviderProfile, VerificationStatus
from app.schemas import ProviderProfileOut, VerificationUpdate
from app.security import get_current_user
from app.services.provider_service import to_provider_profile_out

router = APIRouter(prefix="/admin", tags=["admin"])

_admin_phones_env = os.getenv("ADMIN_PHONES", "")
ADMIN_PHONES = {p.strip() for p in _admin_phones_env.split(",") if p.strip()}


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.phone not in ADMIN_PHONES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access only.")
    return user


@router.get("/providers", response_model=list[ProviderProfileOut])
def list_providers(
    status_filter: VerificationStatus | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """All providers with their verification status — the admin queue."""
    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    q = db.query(User).filter(User.role == Role.PROVIDER)
    providers = q.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    out = []
    for p in providers:
        profile = p.provider_profile
        if status_filter and (profile.verification_status if profile else VerificationStatus.PENDING) != status_filter:
            continue
        out.append(to_provider_profile_out(p, profile))
    return out


@router.patch("/providers/{user_id}/verification", response_model=ProviderProfileOut)
def update_provider_verification(
    user_id: str,
    body: VerificationUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Approve, reject, or suspend a provider. Creates the profile row if one somehow doesn't exist yet."""
    user = db.get(User, user_id)
    if not user or user.role != Role.PROVIDER:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Provider not found")

    profile = user.provider_profile
    if not profile:
        profile = ProviderProfile(user_id=user_id)
        db.add(profile)

    profile.verification_status = body.status
    profile.verification_note = body.note
    db.commit()
    db.refresh(profile)

    return to_provider_profile_out(user, profile)


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _user: User = Depends(require_admin)):
    users_by_role = dict(
        db.query(User.role, func.count(User.id)).group_by(User.role).all()
    )
    requests_by_status = dict(
        db.query(ServiceRequest.status, func.count(ServiceRequest.id))
        .group_by(ServiceRequest.status)
        .all()
    )

    return {
        "total_users": sum(users_by_role.values()),
        "total_customers": users_by_role.get(Role.CUSTOMER, 0),
        "total_providers": users_by_role.get(Role.PROVIDER, 0),
        "total_requests": sum(requests_by_status.values()),
        "requests_by_status": {
            status.value: requests_by_status.get(status, 0) for status in RequestStatus
        },
        "active_requests": sum(
            requests_by_status.get(s, 0)
            for s in RequestStatus
            if s not in (RequestStatus.COMPLETED, RequestStatus.CANCELLED)
        ),
        "emergency_requests": db.query(func.count(ServiceRequest.id))
        .filter(ServiceRequest.priority == Priority.EMERGENCY)
        .scalar()
        or 0,
    }
