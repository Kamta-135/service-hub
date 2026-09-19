from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Message
from app.services.request_service import _fetch
from app.services.notification_service import notify
from app.rate_limiter import check_and_record

MAX_MESSAGES_PER_WINDOW = 30
WINDOW_SECONDS = 60


def _require_participant(req, user_id: str):
    if user_id not in (req.customer_id, req.provider_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You're not part of this conversation.")


def send_message(db: Session, request_id: str, sender_id: str, body: str) -> Message:
    req = _fetch(db, request_id)
    _require_participant(req, sender_id)

    if not req.provider_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Chat opens once a provider is assigned to this request.")

    if not check_and_record(f"chat:{sender_id}", MAX_MESSAGES_PER_WINDOW, WINDOW_SECONDS):
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "You're sending messages too quickly. Please slow down.")

    msg = Message(request_id=request_id, sender_id=sender_id, body=body)
    db.add(msg)
    db.commit()
    db.refresh(msg)

    recipient_id = req.provider_id if sender_id == req.customer_id else req.customer_id
    notify(db, recipient_id, "new_message", "New message", body[:120], request_id=request_id)

    return msg


def list_messages(db: Session, request_id: str, user_id: str) -> list[Message]:
    req = _fetch(db, request_id)
    _require_participant(req, user_id)

    messages = (
        db.query(Message)
        .filter(Message.request_id == request_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    # Viewing marks every message NOT sent by this user as read by them.
    now = datetime.now(timezone.utc)
    is_customer = user_id == req.customer_id
    changed = False
    for m in messages:
        if m.sender_id == user_id:
            continue
        if is_customer and m.read_by_customer_at is None:
            m.read_by_customer_at = now
            changed = True
        elif not is_customer and m.read_by_provider_at is None:
            m.read_by_provider_at = now
            changed = True
    if changed:
        db.commit()

    return messages
