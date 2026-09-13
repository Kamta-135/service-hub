from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict, field_validator

from app.models import RequestStatus, Priority, Role, PricingType, VerificationStatus, ComplaintCategory, ComplaintStatus, QuoteStatus, WarrantyClaimStatus


# ---------- Catalog (categories / subcategories / services) ----------

class ServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    slug: str
    pricing_type: PricingType
    starting_price: Optional[float] = None
    is_active: bool


class ServiceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    pricing_type: PricingType = PricingType.QUOTE
    starting_price: Optional[float] = Field(None, ge=0)
    sort_order: int = 0


class SubcategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    slug: str
    is_active: bool
    services: List[ServiceOut] = []


class SubcategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    sort_order: int = 0


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    slug: str
    icon: Optional[str] = None
    is_active: bool
    subcategories: List[SubcategoryOut] = []


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    icon: Optional[str] = Field(None, max_length=20)
    sort_order: int = 0


class CatalogItemUpdate(BaseModel):
    """Generic patch body for categories/subcategories/services — every field optional."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    icon: Optional[str] = Field(None, max_length=20)
    pricing_type: Optional[PricingType] = None
    starting_price: Optional[float] = Field(None, ge=0)


# ---------- Provider profile / verification ----------

class ProviderProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: str
    name: Optional[str] = None
    phone: str
    bio: Optional[str] = None
    experience_years: Optional[int] = None
    service_radius_km: Optional[float] = None
    has_location: bool = False  # never expose raw lat/lng publicly
    verification_status: VerificationStatus
    verification_note: Optional[str] = None
    created_at: datetime


class ProviderProfileUpdate(BaseModel):
    bio: Optional[str] = Field(None, max_length=1000)
    experience_years: Optional[int] = Field(None, ge=0, le=70)
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)
    service_radius_km: Optional[float] = Field(None, gt=0, le=200)


class NearbyProviderOut(BaseModel):
    provider_id: str
    name: Optional[str] = None
    bio: Optional[str] = None
    experience_years: Optional[int] = None
    verification_status: VerificationStatus
    distance_km: float
    average_rating: Optional[float] = None
    review_count: int = 0


class VerificationUpdate(BaseModel):
    status: VerificationStatus
    note: Optional[str] = Field(None, max_length=500)


# ---------- Quotes ----------

class QuoteCreate(BaseModel):
    amount: float = Field(..., gt=0)
    eta_minutes: Optional[int] = Field(None, ge=0, le=10080)
    duration_minutes: Optional[int] = Field(None, ge=0, le=10080)
    notes: Optional[str] = Field(None, max_length=1000)
    included_work: Optional[str] = Field(None, max_length=1000)
    excluded_work: Optional[str] = Field(None, max_length=1000)
    warranty_days: Optional[int] = Field(None, ge=0, le=3650)


class QuoteUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    eta_minutes: Optional[int] = Field(None, ge=0, le=10080)
    duration_minutes: Optional[int] = Field(None, ge=0, le=10080)
    notes: Optional[str] = Field(None, max_length=1000)
    included_work: Optional[str] = Field(None, max_length=1000)
    excluded_work: Optional[str] = Field(None, max_length=1000)
    warranty_days: Optional[int] = Field(None, ge=0, le=3650)


class QuoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    request_id: str
    provider_id: str
    amount: float
    eta_minutes: Optional[int] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    included_work: Optional[str] = None
    excluded_work: Optional[str] = None
    warranty_days: Optional[int] = None
    status: QuoteStatus
    created_at: datetime


# ---------- Job Card / Warranty ----------

class JobCardCreate(BaseModel):
    work_performed: str = Field(..., min_length=1, max_length=2000)
    materials_used: Optional[str] = Field(None, max_length=1000)
    final_amount: Optional[float] = Field(None, ge=0)
    warranty_days: Optional[int] = Field(None, ge=0, le=3650)
    warranty_terms: Optional[str] = Field(None, max_length=1000)


class JobCardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    request_id: str
    provider_id: str
    customer_id: str
    work_performed: str
    materials_used: Optional[str] = None
    final_amount: Optional[float] = None
    warranty_days: Optional[int] = None
    warranty_terms: Optional[str] = None
    customer_confirmed_at: Optional[datetime] = None
    created_at: datetime
    warranty_active: bool = False  # computed — is a claim still raisable right now


class WarrantyClaimCreate(BaseModel):
    description: str = Field(..., min_length=1, max_length=2000)


class WarrantyClaimOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    job_card_id: str
    customer_id: str
    description: str
    status: WarrantyClaimStatus
    admin_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class WarrantyClaimStatusUpdate(BaseModel):
    status: WarrantyClaimStatus
    admin_note: Optional[str] = Field(None, max_length=1000)


# ---------- Notifications ----------

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    type: str
    title: str
    body: Optional[str] = None
    request_id: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: datetime


# ---------- Chat ----------

class MessageCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    request_id: str
    sender_id: str
    body: str
    created_at: datetime


# ---------- Complaints ----------

class ComplaintCreate(BaseModel):
    category: ComplaintCategory
    description: str = Field(..., min_length=1, max_length=2000)


class ComplaintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    request_id: str
    customer_id: str
    provider_id: Optional[str] = None
    category: ComplaintCategory
    description: str
    status: ComplaintStatus
    admin_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatus
    admin_note: Optional[str] = Field(None, max_length=1000)


# ---------- Reviews ----------

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    request_id: str
    provider_id: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime


class ProviderReviewsOut(BaseModel):
    average_rating: Optional[float] = None
    review_count: int
    reviews: List[ReviewOut]


# ---------- Auth ----------

class OtpRequestIn(BaseModel):
    phone: str = Field(..., min_length=8, max_length=15, examples=["+919876543210"])

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, v: str) -> str:
        v = v.strip().replace(" ", "")
        if not v.replace("+", "").isdigit():
            raise ValueError("Phone number must contain only digits (and an optional leading +)")
        return v


class OtpVerifyIn(OtpRequestIn):
    code: str = Field(..., min_length=4, max_length=6)
    role: Role = Role.CUSTOMER  # only used the first time this phone registers
    name: Optional[str] = Field(None, max_length=120)


class RefreshIn(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    phone: str
    name: Optional[str] = None
    role: Role
    location_text: Optional[str] = None
    verification_status: Optional[VerificationStatus] = None


class UserLocationUpdate(BaseModel):
    location_text: str = Field(..., min_length=1, max_length=200)


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Service requests ----------

class ServiceRequestCreate(BaseModel):
    service_type: str = Field(..., min_length=1, max_length=100, examples=["electrician"])
    description: str = Field(..., min_length=1, max_length=2000)
    image_url: Optional[str] = Field(None, max_length=1000)
    location_text: str = Field(..., min_length=1, max_length=300, description="Human-readable location, e.g. village/block")
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lng: Optional[float] = Field(None, ge=-180, le=180)
    priority: Priority = Priority.NORMAL


class StatusUpdate(BaseModel):
    status: RequestStatus
    note: Optional[str] = Field(None, max_length=500)


class StatusEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    status: RequestStatus
    note: Optional[str] = None
    created_at: datetime


class ServiceRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    customer_id: str
    provider_id: Optional[str] = None
    service_type: str
    description: str
    image_url: Optional[str] = None
    location_text: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    priority: Priority
    status: RequestStatus
    created_at: datetime
    updated_at: datetime


class ServiceRequestDetail(ServiceRequestOut):
    status_events: List[StatusEventOut] = []
