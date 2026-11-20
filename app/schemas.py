import re
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models import OrderStatus

ORDER_NUMBER_BASE = 10000


def order_number(order_id: int) -> str:
    return f"ORD-{ORDER_NUMBER_BASE + order_id}"


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        if not (re.search(r"[A-Za-z]", v) and re.search(r"\d", v) and re.search(r"[^A-Za-z0-9]", v)):
            raise ValueError("Password must include a letter, a number and a symbol")
        return v


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class OrderBase(BaseModel):
    patient_first_name: str | None = Field(default=None, max_length=100)
    patient_last_name: str | None = Field(default=None, max_length=100)
    patient_dob: date | None = None
    provider_name: str | None = Field(default=None, max_length=200)
    provider_npi: str | None = Field(default=None, max_length=20)


class OrderCreate(OrderBase):
    pass


class OrderUpdate(OrderBase):
    """PATCH body: only fields that are sent are changed. Send null to clear a field."""


class OrderOut(OrderBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_number: str = ""
    status: OrderStatus
    source_filename: str | None
    has_document: bool = False
    document_pages: int | None = None
    issues: dict[str, str]
    missing_fields: list[str] = []
    # Text each extracted value was read from, for side-by-side review
    sources: dict[str, str] = {}
    raw_extraction: dict | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


class OrderList(BaseModel):
    items: list[OrderOut]
    total: int
    limit: int
    offset: int


class OrderStats(BaseModel):
    total: int
    ready: int
    needs_review: int
    processing: int
    draft: int
    failed: int
