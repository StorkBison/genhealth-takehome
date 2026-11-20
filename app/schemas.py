from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import OrderStatus


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


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
    status: OrderStatus
    source_filename: str | None
    issues: dict[str, str]
    missing_fields: list[str] = []
    # Text each extracted value was read from (PDF orders only), for side-by-side review
    sources: dict[str, str] = {}
    created_at: datetime
    updated_at: datetime


class OrderList(BaseModel):
    items: list[OrderOut]
    total: int
    limit: int
    offset: int
