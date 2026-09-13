from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import NotificationOut
from app.security import get_current_user
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/me", response_model=list[NotificationOut])
async def my_notifications(
    limit: int = 30, offset: int = 0,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    return notification_service.list_my_notifications(db, user.id, limit, offset)


@router.get("/unread-count")
async def my_unread_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return {"unread_count": notification_service.unread_count(db, user.id)}


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    ok = notification_service.mark_read(db, user.id, notification_id)
    if not ok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    notification_service.mark_all_read(db, user.id)
    return {"ok": True}
