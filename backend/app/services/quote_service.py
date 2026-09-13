from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models import Quote, QuoteStatus, RequestStatus, StatusEvent
from app.schemas import QuoteCreate, QuoteUpdate
from app.services.request_service import _fetch
from app.services.notification_service import notify


def _ensure_request_open(req):
    if req.status not in (RequestStatus.REQUEST_SENT, RequestStatus.PROVIDER_REVIEWING) or req.provider_id:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This request is no longer open for quotes — it's already been assigned or closed.",
        )


def submit_quote(db: Session, request_id: str, provider_id: str, data: QuoteCreate) -> Quote:
    req = _fetch(db, request_id)
    _ensure_request_open(req)

    quote = Quote(request_id=request_id, provider_id=provider_id, **data.model_dump())
    db.add(quote)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "You've already submitted a quote for this request — edit it instead.")
    db.refresh(quote)
    notify(db, req.customer_id, "quote_received", "New quote received",
           f"₹{quote.amount} quoted for your {req.service_type} request.", request_id=request_id)
    return quote


def update_quote(db: Session, quote_id: str, provider_id: str, data: QuoteUpdate) -> Quote:
    quote = db.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quote not found")
    if quote.provider_id != provider_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only edit your own quote.")
    if quote.status != QuoteStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "This quote has already been decided and can't be edited.")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(quote, field, value)
    db.commit()
    db.refresh(quote)
    return quote


def list_quotes_for_request(db: Session, request_id: str, requesting_user_id: str, requesting_role: str) -> list[Quote]:
    req = _fetch(db, request_id)

    q = db.query(Quote).filter(Quote.request_id == request_id)
    if requesting_role == "customer":
        if req.customer_id != requesting_user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your request.")
        # customer sees every quote, to compare
    elif requesting_role == "provider":
        q = q.filter(Quote.provider_id == requesting_user_id)  # only their own

    return q.order_by(Quote.amount.asc()).all()


def accept_quote(db: Session, request_id: str, quote_id: str, customer_id: str):
    req = _fetch(db, request_id)
    if req.customer_id != customer_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your request.")

    quote = db.get(Quote, quote_id)
    if not quote or quote.request_id != request_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Quote not found for this request.")
    if quote.status != QuoteStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "This quote is no longer pending.")

    _ensure_request_open(req)  # someone (direct-accept or another quote) may have beaten this one to it

    quote.status = QuoteStatus.ACCEPTED
    req.provider_id = quote.provider_id
    req.status = RequestStatus.ACCEPTED
    db.add(StatusEvent(request_id=req.id, status=RequestStatus.ACCEPTED, note=f"Customer accepted quote from provider {quote.provider_id}"))

    # every other pending quote on this request is now moot
    others = db.query(Quote).filter(
        Quote.request_id == request_id, Quote.id != quote_id, Quote.status == QuoteStatus.PENDING
    ).all()
    for o in others:
        o.status = QuoteStatus.REJECTED

    db.commit()
    db.refresh(req)
    notify(db, quote.provider_id, "quote_accepted", "Your quote was accepted!",
           f"You've been assigned to the {req.service_type} request.", request_id=req.id)
    return req
