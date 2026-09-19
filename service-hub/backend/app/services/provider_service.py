from app.models import VerificationStatus
from app.schemas import ProviderProfileOut


def to_provider_profile_out(user, profile) -> ProviderProfileOut:
    return ProviderProfileOut(
        user_id=user.id, name=user.name, phone=user.phone,
        bio=profile.bio if profile else None,
        experience_years=profile.experience_years if profile else None,
        service_radius_km=profile.service_radius_km if profile else None,
        has_location=bool(profile and profile.lat is not None and profile.lng is not None),
        verification_status=profile.verification_status if profile else VerificationStatus.PENDING,
        verification_note=profile.verification_note if profile else None,
        created_at=profile.created_at if profile else user.created_at,
    )
