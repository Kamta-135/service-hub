from typing import Optional, List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Review, ServiceRequest, RequestStatus
from app.schemas import ReviewCreate
from app.services.request_service import _fetch
from app.services.notification_service import notify


def create_review(db: Session, request_id: str, customer_id: str, data: ReviewCreate) -> Review:
    req = _fetch(db, request_id)

    if req.customer_id != customer_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only review your own requests.")

    if req.status != RequestStatus.COMPLETED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can only review a completed service.")

    if not req.provider_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This request has no assigned provider to review.")

    existing = db.query(Review).filter(Review.request_id == request_id).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "You've already reviewed this booking.")

    review = Review(
        request_id=request_id,
        customer_id=customer_id,
        provider_id=req.provider_id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    notify(db, review.provider_id, "new_review", f"You received a {review.rating}-star review",
           review.comment, request_id=review.request_id)
    return review


def get_provider_reviews(db: Session, provider_id: str, limit: int = 20, offset: int = 0) -> dict:
    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    avg_rating = db.query(func.avg(Review.rating)).filter(Review.provider_id == provider_id).scalar()
    count = db.query(func.count(Review.id)).filter(Review.provider_id == provider_id).scalar()

    reviews = (
        db.query(Review)
        .filter(Review.provider_id == provider_id)
        .order_by(Review.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "average_rating": round(avg_rating, 2) if avg_rating is not None else None,
        "review_count": count or 0,
        "reviews": reviews,
    }
