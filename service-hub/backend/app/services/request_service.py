from typing import Optional, List

from fastapi import HTTPException, status as http_status
from sqlalchemy.orm import Session

from app.models import ServiceRequest, StatusEvent, RequestStatus, ALLOWED_TRANSITIONS
from app.schemas import ServiceRequestCreate
from app.services.notification_service import notify


def create_request(db: Session, customer_id: str, data: ServiceRequestCreate) -> ServiceRequest:
    req = ServiceRequest(
        customer_id=customer_id,
        service_type=data.service_type,
        description=data.description,
        image_url=data.image_url,
        location_text=data.location_text,
        lat=data.lat,
        lng=data.lng,
        priority=data.priority,
        status=RequestStatus.REQUEST_SENT,
    )
    db.add(req)
    db.flush()  # get req.id before commit

    db.add(StatusEvent(request_id=req.id, status=RequestStatus.REQUEST_SENT, note="Request created by customer"))
    db.commit()
    db.refresh(req)
    return req


def _fetch(db: Session, request_id: str) -> ServiceRequest:
    req = db.get(ServiceRequest, request_id)
    if not req:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Service request not found")
    return req


def get_request(db: Session, request_id: str, requesting_user_id: str, requesting_role) -> ServiceRequest:
    req = _fetch(db, request_id)

    is_owner = req.customer_id == requesting_user_id or req.provider_id == requesting_user_id
    if not is_owner:
        # A provider may still look at an unassigned request while deciding
        # whether to accept it; anyone else (a different customer, or a
        # provider who isn't involved and it's already taken) is blocked.
        is_open_for_providers = requesting_role == "provider" and req.provider_id is None
        if not is_open_for_providers:
            raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail="Not your request")
    return req


def list_requests(
    db: Session,
    requesting_user_id: str,
    requesting_role,
    customer_id: Optional[str] = None,
    provider_id: Optional[str] = None,
    status_filter: Optional[RequestStatus] = None,
    limit: int = 20,
    offset: int = 0,
) -> List[ServiceRequest]:
    """
    Scoped so nobody can page through anyone else's requests:
    - customers can only ever see their own (customer_id is forced to
      their own id, regardless of what's in the query string)
    - providers can see their own assigned jobs (provider_id forced to
      their own id) OR, when no customer_id/provider_id filter is given,
      the open pool of unassigned requests (status filter still applies) —
      that's the "new requests" list on the provider dashboard.
    """
    q = db.query(ServiceRequest)

    if requesting_role == "customer":
        q = q.filter(ServiceRequest.customer_id == requesting_user_id)
    elif requesting_role == "provider":
        if customer_id or provider_id:
            q = q.filter(ServiceRequest.provider_id == requesting_user_id)
        else:
            q = q.filter(ServiceRequest.provider_id.is_(None))

    if status_filter:
        q = q.filter(ServiceRequest.status == status_filter)

    limit = max(1, min(limit, 100))  # hard cap regardless of what's requested
    offset = max(0, offset)
    return q.order_by(ServiceRequest.created_at.desc()).offset(offset).limit(limit).all()


def accept_request(db: Session, request_id: str, provider_id: str) -> ServiceRequest:
    req = _fetch(db, request_id)

    if req.status not in (RequestStatus.REQUEST_SENT, RequestStatus.PROVIDER_REVIEWING):
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=f"Request cannot be accepted from status '{req.status.value}'",
        )
    if req.provider_id and req.provider_id != provider_id:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="Request has already been claimed by another provider",
        )

    req.provider_id = provider_id
    req.status = RequestStatus.ACCEPTED
    db.add(StatusEvent(request_id=req.id, status=RequestStatus.ACCEPTED, note=f"Accepted by provider {provider_id}"))
    db.commit()
    db.refresh(req)
    notify(db, req.customer_id, "request_accepted", "A provider accepted your request",
           f"Your {req.service_type} request has been accepted.", request_id=req.id)
    return req


def reject_request(db: Session, request_id: str, provider_id: str, note: Optional[str] = None) -> ServiceRequest:
    req = _fetch(db, request_id)

    if req.status not in (RequestStatus.REQUEST_SENT, RequestStatus.PROVIDER_REVIEWING):
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=f"Request cannot be rejected from status '{req.status.value}'",
        )

    # Rejection doesn't cancel the request for the customer — it just stays
    # unassigned (REQUEST_SENT) so other providers can still pick it up.
    req.status = RequestStatus.REQUEST_SENT
    db.add(StatusEvent(
        request_id=req.id,
        status=RequestStatus.REQUEST_SENT,
        note=note or f"Rejected by provider {provider_id}, reopened for others",
    ))
    db.commit()
    db.refresh(req)
    return req


# Statuses only the assigned provider may set. CANCELLED is excluded so the
# customer can also cancel their own request.
_PROVIDER_ONLY_STATUSES = {RequestStatus.ON_THE_WAY, RequestStatus.SERVICE_STARTED, RequestStatus.COMPLETED}


def update_status(
    db: Session,
    request_id: str,
    new_status: RequestStatus,
    acting_user_id: str,
    acting_role: str,
    note: Optional[str] = None,
) -> ServiceRequest:
    req = _fetch(db, request_id)

    is_owner_customer = acting_role == "customer" and req.customer_id == acting_user_id
    is_assigned_provider = acting_role == "provider" and req.provider_id == acting_user_id

    if new_status in _PROVIDER_ONLY_STATUSES and not is_assigned_provider:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only the assigned provider can set this status",
        )
    if new_status == RequestStatus.CANCELLED and not (is_owner_customer or is_assigned_provider):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only the customer or the assigned provider can cancel this request",
        )

    allowed = ALLOWED_TRANSITIONS.get(req.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=f"Cannot move from '{req.status.value}' to '{new_status.value}'. "
                   f"Allowed next steps: {[s.value for s in allowed] or 'none (terminal state)'}",
        )

    req.status = new_status
    db.add(StatusEvent(request_id=req.id, status=new_status, note=note))
    db.commit()
    db.refresh(req)

    status_titles = {
        RequestStatus.ON_THE_WAY: "Your provider is on the way",
        RequestStatus.SERVICE_STARTED: "Service has started",
        RequestStatus.COMPLETED: "Service completed — rate your experience",
        RequestStatus.CANCELLED: "Request was cancelled",
    }
    title = status_titles.get(new_status)
    if title:
        # tell whichever side didn't just make this change
        recipient = req.provider_id if acting_role == "customer" else req.customer_id
        if recipient:
            notify(db, recipient, f"status_{new_status.value}", title, note, request_id=req.id)

    return req
