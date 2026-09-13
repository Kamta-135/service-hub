from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Notification


def notify(db: Session, user_id: str, type: str, title: str, body: str | None = None, request_id: str | None = None) -> None:
    """
    Fire-and-forget: called from other services (accept_request,
    update_status, submit_quote, etc.) right after their own db.commit().
    Never raises — a notification failing to save should never break the
    action that triggered it.
    """
    try:
        db.add(Notification(user_id=user_id, type=type, title=title, body=body, request_id=request_id))
        db.commit()
    except Exception:
        db.rollback()


def list_my_notifications(db: Session, user_id: str, limit: int = 30, offset: int = 0) -> list[Notification]:
    limit = max(1, min(limit, 100))
    offset = max(0, offset)
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


def unread_count(db: Session, user_id: str) -> int:
    return db.query(func.count(Notification.id)).filter(
        Notification.user_id == user_id, Notification.read_at.is_(None)
    ).scalar() or 0


def mark_read(db: Session, user_id: str, notification_id: str) -> bool:
    from datetime import datetime, timezone
    n = db.get(Notification, notification_id)
    if not n or n.user_id != user_id:
        return False
    if n.read_at is None:
        n.read_at = datetime.now(timezone.utc)
        db.commit()
    return True


def mark_all_read(db: Session, user_id: str) -> None:
    from datetime import datetime, timezone
    db.query(Notification).filter(
        Notification.user_id == user_id, Notification.read_at.is_(None)
    ).update({"read_at": datetime.now(timezone.utc)})
    db.commit()
