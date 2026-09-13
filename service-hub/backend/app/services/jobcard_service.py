from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import JobCard, WarrantyClaim, WarrantyClaimStatus, RequestStatus
from app.schemas import JobCardCreate, WarrantyClaimCreate, WarrantyClaimStatusUpdate
from app.services.request_service import _fetch
from app.services.notification_service import notify


def create_job_card(db: Session, request_id: str, provider_id: str, data: JobCardCreate) -> JobCard:
    req = _fetch(db, request_id)

    if req.provider_id != provider_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the assigned provider can fill out the job card.")
    if req.status != RequestStatus.COMPLETED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The job must be marked COMPLETED before filling out a job card.")

    existing = db.query(JobCard).filter(JobCard.request_id == request_id).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "A job card already exists for this booking.")

    job_card = JobCard(
        request_id=request_id, provider_id=provider_id, customer_id=req.customer_id,
        **data.model_dump(),
    )
    db.add(job_card)
    db.commit()
    db.refresh(job_card)

    notify(db, req.customer_id, "job_card_ready", "Your job card is ready",
           "View the work summary and confirm the job.", request_id=request_id)
    return job_card


def get_job_card(db: Session, request_id: str, user_id: str) -> JobCard:
    job_card = db.query(JobCard).filter(JobCard.request_id == request_id).first()
    if not job_card:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No job card for this request yet.")
    if user_id not in (job_card.customer_id, job_card.provider_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your booking.")
    return job_card


def confirm_job_card(db: Session, request_id: str, customer_id: str) -> JobCard:
    job_card = get_job_card(db, request_id, customer_id)
    if job_card.customer_id != customer_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the customer can confirm this job.")
    if job_card.customer_confirmed_at is None:
        job_card.customer_confirmed_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(job_card)
    return job_card


def raise_warranty_claim(db: Session, request_id: str, customer_id: str, data: WarrantyClaimCreate) -> WarrantyClaim:
    job_card = get_job_card(db, request_id, customer_id)
    if job_card.customer_id != customer_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the customer can raise a warranty claim.")
    if not job_card.warranty_active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This job has no active warranty to claim against.")

    claim = WarrantyClaim(job_card_id=job_card.id, customer_id=customer_id, description=data.description)
    db.add(claim)
    db.commit()
    db.refresh(claim)

    notify(db, job_card.provider_id, "warranty_claim", "A warranty claim was raised",
           data.description[:120], request_id=request_id)
    return claim


def list_all_claims(db: Session, status_filter: WarrantyClaimStatus | None, limit: int, offset: int) -> list[WarrantyClaim]:
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    q = db.query(WarrantyClaim)
    if status_filter:
        q = q.filter(WarrantyClaim.status == status_filter)
    return q.order_by(WarrantyClaim.created_at.desc()).offset(offset).limit(limit).all()


def update_claim_status(db: Session, claim_id: str, data: WarrantyClaimStatusUpdate) -> WarrantyClaim:
    claim = db.get(WarrantyClaim, claim_id)
    if not claim:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Warranty claim not found")
    claim.status = data.status
    if data.admin_note is not None:
        claim.admin_note = data.admin_note
    db.commit()
    db.refresh(claim)

    notify(db, claim.customer_id, "warranty_update", f"Warranty claim update: {data.status.value.replace('_', ' ')}",
           data.admin_note)
    return claim
