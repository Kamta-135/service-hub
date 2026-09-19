from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, WarrantyClaimStatus, Role
from app.schemas import (
    JobCardCreate, JobCardOut, WarrantyClaimCreate, WarrantyClaimOut, WarrantyClaimStatusUpdate,
)
from app.security import require_role, get_current_user
from app.services import jobcard_service
from app.routers.admin import require_admin

router = APIRouter(tags=["job-cards"])


@router.post("/requests/{request_id}/job-card", response_model=JobCardOut)
async def create_job_card(
    request_id: str, payload: JobCardCreate,
    db: Session = Depends(get_db), user: User = Depends(require_role(Role.PROVIDER)),
):
    """Provider fills this out once the job is COMPLETED — one per booking."""
    return jobcard_service.create_job_card(db, request_id, user.id, payload)


@router.get("/requests/{request_id}/job-card", response_model=JobCardOut)
async def get_job_card(
    request_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    return jobcard_service.get_job_card(db, request_id, user.id)


@router.post("/requests/{request_id}/job-card/confirm", response_model=JobCardOut)
async def confirm_job_card(
    request_id: str, db: Session = Depends(get_db), user: User = Depends(require_role(Role.CUSTOMER)),
):
    """Customer confirms the work was done as described."""
    return jobcard_service.confirm_job_card(db, request_id, user.id)


@router.post("/requests/{request_id}/warranty-claim", response_model=WarrantyClaimOut)
async def raise_warranty_claim(
    request_id: str, payload: WarrantyClaimCreate,
    db: Session = Depends(get_db), user: User = Depends(require_role(Role.CUSTOMER)),
):
    """Only works while the job card's warranty window is still open."""
    return jobcard_service.raise_warranty_claim(db, request_id, user.id, payload)


@router.get("/admin/warranty-claims", response_model=list[WarrantyClaimOut])
async def list_warranty_claims(
    status_filter: WarrantyClaimStatus | None = None, limit: int = 50, offset: int = 0,
    db: Session = Depends(get_db), _admin: User = Depends(require_admin),
):
    return jobcard_service.list_all_claims(db, status_filter, limit, offset)


@router.patch("/admin/warranty-claims/{claim_id}", response_model=WarrantyClaimOut)
async def resolve_warranty_claim(
    claim_id: str, payload: WarrantyClaimStatusUpdate,
    db: Session = Depends(get_db), _admin: User = Depends(require_admin),
):
    return jobcard_service.update_claim_status(db, claim_id, payload)
