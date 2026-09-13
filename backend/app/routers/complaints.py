from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, ComplaintStatus
from app.schemas import ComplaintCreate, ComplaintOut, ComplaintStatusUpdate
from app.security import get_current_user
from app.services import complaint_service
from app.routers.admin import require_admin

router = APIRouter(tags=["complaints"])


@router.post("/requests/{request_id}/complaints", response_model=ComplaintOut)
async def file_complaint(
    request_id: str, payload: ComplaintCreate,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    """Customer files a complaint about their own booking."""
    return complaint_service.create_complaint(db, request_id, user.id, payload)


@router.get("/complaints/me", response_model=list[ComplaintOut])
async def my_complaints(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Everything the current user has filed."""
    return complaint_service.list_my_complaints(db, user.id)


@router.get("/admin/complaints", response_model=list[ComplaintOut])
async def list_complaints(
    status_filter: ComplaintStatus | None = None, limit: int = 50, offset: int = 0,
    db: Session = Depends(get_db), _admin: User = Depends(require_admin),
):
    """Admin queue — all complaints, optionally filtered by status."""
    return complaint_service.list_all_complaints(db, status_filter, limit, offset)


@router.patch("/admin/complaints/{complaint_id}", response_model=ComplaintOut)
async def resolve_complaint(
    complaint_id: str, payload: ComplaintStatusUpdate,
    db: Session = Depends(get_db), _admin: User = Depends(require_admin),
):
    """Admin moves a complaint through the resolution workflow and can leave a note."""
    return complaint_service.update_complaint_status(db, complaint_id, payload)
