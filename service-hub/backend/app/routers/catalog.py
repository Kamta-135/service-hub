"""
Catalog: categories -> subcategories -> services.

Public endpoint (GET /categories) is what the frontend uses to build the
"what do you need help with" picker. The /admin/catalog/* endpoints are
how an admin adds/edits/deactivates things without a code change or
deploy — exactly the "admin can manage services without developer
intervention" requirement.

Deactivating (is_active=false) is preferred over deleting: old
ServiceRequest rows store the service name as plain text (see
models.ServiceRequest.service_type), so removing a Service from the
catalog doesn't corrupt historical requests — it just stops it from
being offered to new customers.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Category, Subcategory, Service, User, Role, ProviderProfile, ProviderService, VerificationStatus
from app.schemas import (
    CategoryOut, CategoryCreate, SubcategoryOut, SubcategoryCreate,
    ServiceOut, ServiceCreate, CatalogItemUpdate, ProviderReviewsOut,
    ProviderProfileOut, ProviderProfileUpdate, NearbyProviderOut,
)
from app.routers.admin import require_admin
from app.security import get_current_user
from app.services.review_service import get_provider_reviews
from app.services.provider_service import to_provider_profile_out
from app.geo import haversine_km

router = APIRouter(tags=["catalog"])


@router.get("/providers/{provider_id}/reviews", response_model=ProviderReviewsOut)
def list_provider_reviews(
    provider_id: str, limit: int = 20, offset: int = 0, db: Session = Depends(get_db),
):
    """Public — powers a provider's profile page (average rating + review list)."""
    return get_provider_reviews(db, provider_id, limit, offset)


@router.get("/providers/nearby", response_model=list[NearbyProviderOut])
def find_nearby_providers(
    lat: float, lng: float,
    radius_km: Optional[float] = None,
    service_slug: Optional[str] = None,
    verified_only: bool = True,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """
    Public — the core "find help near me" query. Distance is computed in
    Python (Haversine) rather than a DB geo-index, which is fine at
    today's scale; see app/geo.py for when that stops being true.

    A provider matches if they've set a location AND the distance is
    within BOTH their own service_radius_km and the caller's optional
    radius_km (whichever is stricter) — mirrors the doc's "provider
    radius vs customer search radius" rule.
    """
    limit = max(1, min(limit, 50))

    q = db.query(ProviderProfile).filter(
        ProviderProfile.lat.isnot(None), ProviderProfile.lng.isnot(None)
    )
    if verified_only:
        q = q.filter(ProviderProfile.verification_status == VerificationStatus.VERIFIED)

    if service_slug:
        service = db.query(Service).filter(Service.slug == service_slug).first()
        if not service:
            return []
        offering_provider_ids = {
            row[0] for row in db.query(ProviderService.provider_id)
            .filter(ProviderService.service_id == service.id).all()
        }
        if not offering_provider_ids:
            return []
        q = q.filter(ProviderProfile.user_id.in_(offering_provider_ids))

    candidates = q.all()

    # Filter by distance first (cheap, in-memory), THEN fetch review
    # aggregates in ONE batched query for just the matches — avoids an
    # N+1 query pattern that would get slow as the provider count grows.
    matched = []
    for profile in candidates:
        distance = haversine_km(lat, lng, profile.lat, profile.lng)
        effective_radius = profile.service_radius_km or 10.0
        if radius_km is not None:
            effective_radius = min(effective_radius, radius_km)
        if distance <= effective_radius:
            matched.append((profile, round(distance, 2)))

    matched_ids = [p.user_id for p, _ in matched]
    review_stats: dict[str, tuple[float | None, int]] = {}
    if matched_ids:
        from sqlalchemy import func
        from app.models import Review
        rows = (
            db.query(Review.provider_id, func.avg(Review.rating), func.count(Review.id))
            .filter(Review.provider_id.in_(matched_ids))
            .group_by(Review.provider_id)
            .all()
        )
        review_stats = {pid: (round(avg, 2) if avg is not None else None, count) for pid, avg, count in rows}

    results = []
    for profile, distance in matched:
        avg_rating, review_count = review_stats.get(profile.user_id, (None, 0))
        results.append(NearbyProviderOut(
            provider_id=profile.user_id,
            name=profile.user.name if profile.user else None,
            bio=profile.bio,
            experience_years=profile.experience_years,
            verification_status=profile.verification_status,
            distance_km=distance,
            average_rating=avg_rating,
            review_count=review_count,
        ))

    results.sort(key=lambda r: r.distance_km)
    return results[:limit]


@router.get("/providers/me", response_model=ProviderProfileOut)
def get_my_provider_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != Role.PROVIDER:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only providers have a provider profile.")
    profile = user.provider_profile
    if not profile:
        profile = ProviderProfile(user_id=user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return to_provider_profile_out(user, profile)


@router.patch("/providers/me", response_model=ProviderProfileOut)
def update_my_provider_profile(
    body: ProviderProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    if user.role != Role.PROVIDER:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only providers have a provider profile.")
    profile = user.provider_profile
    if not profile:
        profile = ProviderProfile(user_id=user.id)
        db.add(profile)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return to_provider_profile_out(user, profile)


@router.post("/providers/me/services/{service_id}")
def add_my_service(service_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Provider declares they offer a given catalog service."""
    if user.role != Role.PROVIDER:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only providers can manage their services.")
    if not db.get(Service, service_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Service not found")
    if not db.query(ProviderService).filter_by(provider_id=user.id, service_id=service_id).first():
        db.add(ProviderService(provider_id=user.id, service_id=service_id))
        db.commit()
    return {"ok": True}


@router.delete("/providers/me/services/{service_id}")
def remove_my_service(service_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != Role.PROVIDER:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only providers can manage their services.")
    db.query(ProviderService).filter_by(provider_id=user.id, service_id=service_id).delete()
    db.commit()
    return {"ok": True}


# ---------- Public ----------

@router.get("/categories", response_model=list[CategoryOut])
def list_categories(include_inactive: bool = False, db: Session = Depends(get_db)):
    q = db.query(Category).options(
        joinedload(Category.subcategories).joinedload(Subcategory.services)
    ).order_by(Category.sort_order)
    if not include_inactive:
        q = q.filter(Category.is_active.is_(True))
    categories = q.all()

    if not include_inactive:
        # Nested collections were eager-loaded unfiltered; trim inactive
        # subcategories/services out in Python rather than a second query.
        for c in categories:
            c.subcategories = [s for s in c.subcategories if s.is_active]
            for s in c.subcategories:
                s.services = [sv for sv in s.services if sv.is_active]
    return categories


# ---------- Admin ----------

def _unique_or_409(db: Session, model, slug: str):
    if db.query(model).filter(model.slug == slug).first():
        raise HTTPException(status.HTTP_409_CONFLICT, f"slug '{slug}' already in use")


@router.post("/admin/catalog/categories", response_model=CategoryOut)
def create_category(body: CategoryCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    _unique_or_409(db, Category, body.slug)
    cat = Category(**body.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.patch("/admin/catalog/categories/{category_id}", response_model=CategoryOut)
def update_category(category_id: str, body: CatalogItemUpdate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    cat = db.get(Category, category_id)
    if not cat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        if hasattr(cat, field):
            setattr(cat, field, value)
    db.commit()
    db.refresh(cat)
    return cat


@router.post("/admin/catalog/categories/{category_id}/subcategories", response_model=SubcategoryOut)
def create_subcategory(category_id: str, body: SubcategoryCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    if not db.get(Category, category_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")
    _unique_or_409(db, Subcategory, body.slug)
    sub = Subcategory(category_id=category_id, **body.model_dump())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.patch("/admin/catalog/subcategories/{subcategory_id}", response_model=SubcategoryOut)
def update_subcategory(subcategory_id: str, body: CatalogItemUpdate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    sub = db.get(Subcategory, subcategory_id)
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subcategory not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        if hasattr(sub, field):
            setattr(sub, field, value)
    db.commit()
    db.refresh(sub)
    return sub


@router.post("/admin/catalog/subcategories/{subcategory_id}/services", response_model=ServiceOut)
def create_service(subcategory_id: str, body: ServiceCreate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    if not db.get(Subcategory, subcategory_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subcategory not found")
    _unique_or_409(db, Service, body.slug)
    svc = Service(subcategory_id=subcategory_id, **body.model_dump())
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return svc


@router.patch("/admin/catalog/services/{service_id}", response_model=ServiceOut)
def update_service(service_id: str, body: CatalogItemUpdate, db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    svc = db.get(Service, service_id)
    if not svc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Service not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        if hasattr(svc, field):
            setattr(svc, field, value)
    db.commit()
    db.refresh(svc)
    return svc
