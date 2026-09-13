from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Complaint, ComplaintStatus
from app.schemas import ComplaintCreate, ComplaintStatusUpdate
from app.services.request_service import _fetch
from app.services.notification_service import notify

# An open complaint blocks filing a duplicate on the same request — stops
# accidental double-submits — but a customer can file a new one once the
# old one is resolved/rejected (e.g. the issue recurred).
_BLOCKING_STATUSES = {
    ComplaintStatus.OPEN, ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.WAITING_FOR_CUSTOMER, ComplaintStatus.WAITING_FOR_PROVIDER,
    ComplaintStatus.ESCALATED,
}


def create_complaint(db: Session, request_id: str, customer_id: str, data: ComplaintCreate) -> Complaint:
    req = _fetch(db, request_id)

    if req.customer_id != customer_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only file a complaint about your own request.")

    existing_open = (
        db.query(Complaint)
        .filter(Complaint.request_id == request_id, Complaint.status.in_(_BLOCKING_STATUSES))
        .first()
    )
    if existing_open:
        raise HTTPException(status.HTTP_409_CONFLICT, "There's already an open complaint for this booking.")

    complaint = Complaint(
        request_id=request_id,
        customer_id=customer_id,
        provider_id=req.provider_id,
        category=data.category,
        description=data.description,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


def list_my_complaints(db: Session, customer_id: str) -> list[Complaint]:
    return (
        db.query(Complaint)
        .filter(Complaint.customer_id == customer_id)
        .order_by(Complaint.created_at.desc())
        .all()
    )


def list_all_complaints(db: Session, status_filter: ComplaintStatus | None, limit: int, offset: int) -> list[Complaint]:
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    q = db.query(Complaint)
    if status_filter:
        q = q.filter(Complaint.status == status_filter)
    return q.order_by(Complaint.created_at.desc()).offset(offset).limit(limit).all()


def update_complaint_status(db: Session, complaint_id: str, data: ComplaintStatusUpdate) -> Complaint:
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Complaint not found")
    complaint.status = data.status
    if data.admin_note is not None:
        complaint.admin_note = data.admin_note
    db.commit()
    db.refresh(complaint)
    notify(db, complaint.customer_id, "complaint_update", f"Complaint update: {data.status.value.replace('_', ' ')}",
           data.admin_note, request_id=complaint.request_id)
    return complaint
