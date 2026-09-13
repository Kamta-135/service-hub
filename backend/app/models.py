import uuid
import enum
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Float, DateTime, ForeignKey, Integer, Boolean, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


def new_id() -> str:
    return uuid.uuid4().hex


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Role(str, enum.Enum):
    CUSTOMER = "customer"
    PROVIDER = "provider"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=new_id)
    phone = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=True)
    role = Column(SAEnum(Role), nullable=False, default=Role.CUSTOMER)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    provider_profile = relationship("ProviderProfile", uselist=False, backref="user")

    @property
    def verification_status(self):
        """None for customers; a provider without a profile row yet reads as PENDING."""
        if self.role != Role.PROVIDER:
            return None
        return self.provider_profile.verification_status if self.provider_profile else VerificationStatus.PENDING


class OtpCode(Base):
    __tablename__ = "otp_codes"

    id = Column(String, primary_key=True, default=new_id)
    phone = Column(String, nullable=False, index=True)
    code_hash = Column(String, nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    consumed = Column(Boolean, nullable=False, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class RequestStatus(str, enum.Enum):
    REQUEST_SENT = "request_sent"
    PROVIDER_REVIEWING = "provider_reviewing"
    ACCEPTED = "accepted"
    ON_THE_WAY = "on_the_way"
    SERVICE_STARTED = "service_started"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Priority(str, enum.Enum):
    NORMAL = "normal"
    URGENT = "urgent"
    EMERGENCY = "emergency"


# Allowed forward transitions. Cancellation is allowed from any non-terminal state.
ALLOWED_TRANSITIONS = {
    RequestStatus.REQUEST_SENT: {RequestStatus.PROVIDER_REVIEWING, RequestStatus.CANCELLED},
    RequestStatus.PROVIDER_REVIEWING: {RequestStatus.ACCEPTED, RequestStatus.CANCELLED},
    RequestStatus.ACCEPTED: {RequestStatus.ON_THE_WAY, RequestStatus.CANCELLED},
    RequestStatus.ON_THE_WAY: {RequestStatus.SERVICE_STARTED, RequestStatus.CANCELLED},
    RequestStatus.SERVICE_STARTED: {RequestStatus.COMPLETED, RequestStatus.CANCELLED},
    RequestStatus.COMPLETED: set(),
    RequestStatus.CANCELLED: set(),
}


class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=new_id)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, unique=True, index=True)
    icon = Column(String, nullable=True)  # e.g. an emoji or icon name for the UI
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    subcategories = relationship(
        "Subcategory", back_populates="category",
        cascade="all, delete-orphan", order_by="Subcategory.sort_order",
    )


class Subcategory(Base):
    __tablename__ = "subcategories"

    id = Column(String, primary_key=True, default=new_id)
    category_id = Column(String, ForeignKey("categories.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, unique=True, index=True)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    category = relationship("Category", back_populates="subcategories")
    services = relationship(
        "Service", back_populates="subcategory",
        cascade="all, delete-orphan", order_by="Service.sort_order",
    )


class PricingType(str, enum.Enum):
    FIXED = "fixed"
    HOURLY = "hourly"
    PER_KM = "per_km"
    PER_UNIT = "per_unit"
    INSPECTION = "inspection"
    QUOTE = "quote"
    NEGOTIABLE = "negotiable"


class Service(Base):
    __tablename__ = "services"

    id = Column(String, primary_key=True, default=new_id)
    subcategory_id = Column(String, ForeignKey("subcategories.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, unique=True, index=True)
    pricing_type = Column(SAEnum(PricingType), nullable=False, default=PricingType.QUOTE)
    starting_price = Column(Float, nullable=True)  # null when pricing_type doesn't have a simple number (QUOTE, INSPECTION)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    subcategory = relationship("Subcategory", back_populates="services")


class ProviderService(Base):
    """Which services a provider offers — powers the service filter in nearby search."""
    __tablename__ = "provider_services"
    __table_args__ = (UniqueConstraint("provider_id", "service_id", name="uq_provider_service"),)

    id = Column(String, primary_key=True, default=new_id)
    provider_id = Column(String, nullable=False, index=True)
    service_id = Column(String, ForeignKey("services.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    SUSPENDED = "suspended"


class ComplaintCategory(str, enum.Enum):
    POOR_SERVICE = "poor_service"
    WRONG_PRICE = "wrong_price"
    NO_SHOW = "no_show"
    LATE_ARRIVAL = "late_arrival"
    PAYMENT_ISSUE = "payment_issue"
    DAMAGE = "damage"
    FRAUD_CONCERN = "fraud_concern"
    OTHER = "other"


class ComplaintStatus(str, enum.Enum):
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    WAITING_FOR_CUSTOMER = "waiting_for_customer"
    WAITING_FOR_PROVIDER = "waiting_for_provider"
    RESOLVED = "resolved"
    REJECTED = "rejected"
    ESCALATED = "escalated"


class QuoteStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class Quote(Base):
    """
    A provider's bid on an unassigned request. Customer compares quotes
    and accepts one; the existing direct "accept_request" path (first
    provider to claim it) still works unchanged — whichever happens
    first wins, since both paths require the request to still be
    unassigned (provider_id is null) at the moment of commit.
    """
    __tablename__ = "quotes"
    __table_args__ = (UniqueConstraint("request_id", "provider_id", name="uq_quote_request_provider"),)

    id = Column(String, primary_key=True, default=new_id)
    request_id = Column(String, ForeignKey("service_requests.id"), nullable=False, index=True)
    provider_id = Column(String, nullable=False, index=True)

    amount = Column(Float, nullable=False)
    eta_minutes = Column(Integer, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    included_work = Column(Text, nullable=True)
    excluded_work = Column(Text, nullable=True)
    warranty_days = Column(Integer, nullable=True)

    status = Column(SAEnum(QuoteStatus), nullable=False, default=QuoteStatus.PENDING, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)


class Notification(Base):
    """
    In-app notifications only for now — push/SMS delivery is a separate,
    later integration (same abstraction pattern as app/sms.py). type is a
    plain string (not an enum) so new notification triggers don't need a
    migration; request_id lets the frontend deep-link into the relevant
    booking.
    """
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=new_id)
    user_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)
    request_id = Column(String, nullable=True, index=True)

    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)


class Message(Base):
    """
    Booking-linked chat. No separate Conversation table — the request
    itself IS the conversation (its customer_id/provider_id are the two
    participants), which keeps ownership checks identical to everywhere
    else in this codebase.
    """
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=new_id)
    request_id = Column(String, ForeignKey("service_requests.id"), nullable=False, index=True)
    sender_id = Column(String, nullable=False, index=True)
    body = Column(Text, nullable=False)

    read_by_customer_at = Column(DateTime(timezone=True), nullable=True)
    read_by_provider_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String, primary_key=True, default=new_id)
    request_id = Column(String, ForeignKey("service_requests.id"), nullable=False, index=True)
    customer_id = Column(String, nullable=False, index=True)
    provider_id = Column(String, nullable=True, index=True)  # copied from the request at filing time

    category = Column(SAEnum(ComplaintCategory), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(SAEnum(ComplaintStatus), nullable=False, default=ComplaintStatus.OPEN, index=True)
    admin_note = Column(Text, nullable=True)  # visible to the customer as a resolution note

    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class ProviderProfile(Base):
    """
    One row per provider User. Created automatically on registration so
    every provider has a verification status from day one (PENDING until
    an admin reviews them) — this is deliberately NOT enforced as a hard
    block on accepting jobs yet (would lock out everyone already using
    the live app before a real verification workflow existed); it's the
    foundation for that, and for showing verification badges once a
    public provider-discovery page exists.
    """
    __tablename__ = "provider_profiles"

    id = Column(String, primary_key=True, default=new_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True, index=True)

    bio = Column(Text, nullable=True)
    experience_years = Column(Integer, nullable=True)

    # Service area center + radius — never returned raw to the public API
    # (only a computed distance is), per "don't expose exact provider
    # addresses publicly".
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    service_radius_km = Column(Float, nullable=True, default=10.0)

    verification_status = Column(SAEnum(VerificationStatus), nullable=False, default=VerificationStatus.PENDING, index=True)
    verification_note = Column(String, nullable=True)  # admin's reason, shown to the provider

    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Review(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True, default=new_id)
    request_id = Column(String, ForeignKey("service_requests.id"), nullable=False, unique=True, index=True)
    customer_id = Column(String, nullable=False, index=True)
    provider_id = Column(String, nullable=False, index=True)

    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow)


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id = Column(String, primary_key=True, default=new_id)

    customer_id = Column(String, nullable=False, index=True)
    provider_id = Column(String, nullable=True, index=True)

    service_type = Column(String, nullable=False)          # e.g. "electrician"
    description = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)

    location_text = Column(String, nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)

    priority = Column(SAEnum(Priority), nullable=False, default=Priority.NORMAL)
    status = Column(SAEnum(RequestStatus), nullable=False, default=RequestStatus.REQUEST_SENT, index=True)

    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    status_events = relationship(
        "StatusEvent", back_populates="request",
        cascade="all, delete-orphan", order_by="StatusEvent.created_at",
    )


class StatusEvent(Base):
    __tablename__ = "status_events"

    id = Column(String, primary_key=True, default=new_id)
    request_id = Column(String, ForeignKey("service_requests.id"), nullable=False, index=True)

    status = Column(SAEnum(RequestStatus), nullable=False)
    note = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    request = relationship("ServiceRequest", back_populates="status_events")
