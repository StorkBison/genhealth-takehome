import enum
from datetime import date, datetime, timezone

from sqlalchemy import JSON, Date, DateTime, Enum, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class OrderStatus(str, enum.Enum):
    processing = "processing"      # PDF uploaded, extraction running in the background
    failed = "failed"              # extraction could not complete; see error_message
    needs_review = "needs_review"  # extracted, waiting for a person to confirm
    draft = "draft"                # saved by a person but not approved
    ready = "ready"                # approved by a person; every required field present and valid


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    orders: Mapped[list["Order"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    patient_first_name: Mapped[str | None] = mapped_column(String(100))
    patient_last_name: Mapped[str | None] = mapped_column(String(100))
    patient_dob: Mapped[date | None] = mapped_column(Date)
    provider_name: Mapped[str | None] = mapped_column(String(200))
    provider_npi: Mapped[str | None] = mapped_column(String(10))

    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.draft, index=True)
    source_filename: Mapped[str | None] = mapped_column(String(255))
    # The uploaded PDF, kept so reviewers can compare fields against the source. Deferred: list queries never load it.
    document: Mapped[bytes | None] = mapped_column(LargeBinary, deferred=True)
    document_pages: Mapped[int | None] = mapped_column(Integer)
    # Per-field problems found during extraction/validation, e.g. {"provider_npi": "failed check-digit validation"}
    issues: Mapped[dict] = mapped_column(JSON, default=dict)
    # Raw model output (value, source_text, note per field), kept for audit
    raw_extraction: Mapped[dict | None] = mapped_column(JSON)
    error_message: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    owner: Mapped[User] = relationship(back_populates="orders")
