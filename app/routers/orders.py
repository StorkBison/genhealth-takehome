from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Order, OrderStatus, User
from app.schemas import OrderCreate, OrderList, OrderOut, OrderUpdate
from app.services.validation import missing_fields, validate_fields

router = APIRouter(prefix="/orders", tags=["orders"])

ORDER_FIELDS = ("patient_first_name", "patient_last_name", "patient_dob", "provider_name", "provider_npi")


def to_out(order: Order) -> OrderOut:
    out = OrderOut.model_validate(order)
    out.missing_fields = missing_fields({f: getattr(order, f) for f in ORDER_FIELDS})
    return out


def compute_status(order: Order) -> OrderStatus:
    values = {f: getattr(order, f) for f in ORDER_FIELDS}
    if not missing_fields(values) and not order.issues:
        return OrderStatus.ready
    return OrderStatus.needs_review if order.source_filename else OrderStatus.draft


def get_owned_order(order_id: int, user: User, db: Session) -> Order:
    # Filtering by owner in the query means another user's order is indistinguishable from a missing one (404),
    # so order IDs can't be probed across accounts.
    order = db.scalar(select(Order).where(Order.id == order_id, Order.owner_id == user.id))
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return order


def _validate_or_422(data: dict) -> dict:
    clean, issues = validate_fields(data)
    if issues:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, {"message": "Invalid order fields", "issues": issues})
    return clean


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(body: OrderCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    clean = _validate_or_422(body.model_dump())
    order = Order(owner_id=user.id, issues={}, **clean)
    order.status = compute_status(order)
    db.add(order)
    db.commit()
    return to_out(order)


@router.get("", response_model=OrderList)
def list_orders(
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = select(Order).where(Order.owner_id == user.id)
    if status_filter:
        q = q.where(Order.status == status_filter)
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(q.order_by(Order.id.desc()).limit(limit).offset(offset)).all()
    return OrderList(items=[to_out(o) for o in rows], total=total, limit=limit, offset=offset)


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return to_out(get_owned_order(order_id, user, db))


@router.patch("/{order_id}", response_model=OrderOut)
def update_order(
    order_id: int, body: OrderUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    order = get_owned_order(order_id, user, db)
    clean = _validate_or_422(body.model_dump(exclude_unset=True))
    for field, value in clean.items():
        setattr(order, field, value)
    # A human edit to a field resolves any extraction issue recorded for it.
    order.issues = {k: v for k, v in (order.issues or {}).items() if k not in clean}
    order.status = compute_status(order)
    db.commit()
    return to_out(order)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = get_owned_order(order_id, user, db)
    db.delete(order)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
