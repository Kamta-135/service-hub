from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import RequestStatus, Role, User
from app.schemas import (
    ServiceRequestCreate,
    ServiceRequestOut,
    ServiceRequestDetail,
    StatusUpdate,
    ReviewCreate,
    ReviewOut,
    QuoteCreate,
    QuoteUpdate,
    QuoteOut,
    MessageCreate,
    MessageOut,
)
from app.security import require_role, get_current_user
from app.services import request_service, review_service, quote_service, message_service

router = APIRouter(prefix="/requests", tags=["service-requests"])


@router.post("", response_model=ServiceRequestOut, status_code=201)
async def create_service_request(
    payload: ServiceRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(Role.CUSTOMER)),
):
    """Step 1-7 of the customer flow: submit a new service request."""
    return request_service.create_request(db, user.id, payload)


@router.get("", response_model=List[ServiceRequestOut])
async def list_service_requests(
    customer_id: Optional[str] = Query(None),
    provider_id: Optional[str] = Query(None),
    status_filter: Optional[RequestStatus] = Query(None, alias="status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    List requests — scoped to what the caller is allowed to see (their own
    requests as a customer, their assigned jobs or the open pool as a
    provider). See request_service.list_requests for the exact rules.
    """
    return request_service.list_requests(
        db, user.id, user.role.value, customer_id, provider_id, status_filter, limit, offset
    )


@router.get("/{request_id}", response_model=ServiceRequestDetail)
async def get_service_request(
    request_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Step 8: full request detail, including the status timeline for tracking."""
    return request_service.get_request(db, request_id, user.id, user.role.value)


@router.post("/{request_id}/accept", response_model=ServiceRequestOut)
async def accept_service_request(
    request_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(Role.PROVIDER)),
):
    """Provider accepts a new request — assigns them and moves status to ACCEPTED."""
    return request_service.accept_request(db, request_id, user.id)


@router.post("/{request_id}/reject", response_model=ServiceRequestOut)
async def reject_service_request(
    request_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(Role.PROVIDER)),
):
    """Provider declines — request reopens (REQUEST_SENT) for other providers."""
    return request_service.reject_request(db, request_id, user.id)


@router.patch("/{request_id}/status", response_model=ServiceRequestOut)
async def update_service_request_status(
    request_id: str,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Move the request forward: ACCEPTED -> ON_THE_WAY -> SERVICE_STARTED -> COMPLETED,
    or CANCELLED from any non-terminal state. Invalid jumps are rejected (409);
    acting as the wrong role/party for a given transition is rejected (403).
    """
    return request_service.update_status(
        db, request_id, payload.status, user.id, user.role.value, payload.note
    )


@router.post("/{request_id}/review", response_model=ReviewOut)
async def review_completed_request(
    request_id: str,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Customer rates/reviews a completed booking. Only the customer who made
    the request can review it, only once it's COMPLETED, and only once —
    a second attempt gets 409.
    """
    return review_service.create_review(db, request_id, user.id, payload)


@router.post("/{request_id}/quotes", response_model=QuoteOut)
async def submit_quote(
    request_id: str, payload: QuoteCreate,
    db: Session = Depends(get_db), user: User = Depends(require_role(Role.PROVIDER)),
):
    """A provider bids on a still-open (unassigned) request."""
    return quote_service.submit_quote(db, request_id, user.id, payload)


@router.patch("/quotes/{quote_id}", response_model=QuoteOut)
async def edit_quote(
    quote_id: str, payload: QuoteUpdate,
    db: Session = Depends(get_db), user: User = Depends(require_role(Role.PROVIDER)),
):
    """Provider edits their own quote, only while it's still pending."""
    return quote_service.update_quote(db, quote_id, user.id, payload)


@router.get("/{request_id}/quotes", response_model=list[QuoteOut])
async def list_quotes(
    request_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    """Customer sees every quote (to compare); a provider sees only their own."""
    return quote_service.list_quotes_for_request(db, request_id, user.id, user.role.value)


@router.post("/{request_id}/quotes/{quote_id}/accept", response_model=ServiceRequestOut)
async def accept_quote(
    request_id: str, quote_id: str,
    db: Session = Depends(get_db), user: User = Depends(require_role(Role.CUSTOMER)),
):
    """Customer picks a quote — assigns that provider and closes the rest."""
    return quote_service.accept_quote(db, request_id, quote_id, user.id)


@router.post("/{request_id}/messages", response_model=MessageOut)
async def send_message(
    request_id: str, payload: MessageCreate,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    """Booking-linked chat — only the customer and assigned provider can send/read."""
    return message_service.send_message(db, request_id, user.id, payload.body)


@router.get("/{request_id}/messages", response_model=list[MessageOut])
async def get_messages(
    request_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    """Viewing this also marks the other side's messages as read."""
    return message_service.list_messages(db, request_id, user.id)
