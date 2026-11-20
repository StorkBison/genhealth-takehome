import logging
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import get_settings
from app.database import SessionLocal, get_db
from app.models import Order, OrderStatus, User
from app.schemas import (
    ORDER_NUMBER_BASE, DailyCount, OrderCreate, OrderList, OrderOut, OrderStats, OrderUpdate, PeriodCounts, order_number,
)
from app.services.extraction import PDF, ExtractionError, check_document, extract_order_fields, is_configured
from app.services.validation import missing_fields, validate_fields

log = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["orders"])

ORDER_FIELDS = ("patient_first_name", "patient_last_name", "patient_dob", "provider_name", "provider_npi")


def to_out(order: Order) -> OrderOut:
    out = OrderOut.model_validate(order)
    out.order_number = order_number(order.id)
    out.has_document = order.source_filename is not None
    out.missing_fields = missing_fields({f: getattr(order, f) for f in ORDER_FIELDS})
    out.needs_attention = bucket(order) == "needs_attention"
    raw = order.raw_extraction or {}
    out.sources = {
        f: raw[f]["source_text"]
        for f in ORDER_FIELDS
        if isinstance(raw.get(f), dict) and isinstance(raw[f].get("source_text"), str) and raw[f]["source_text"]
    }
    return out


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


def _ensure_editable(order: Order) -> None:
    if order.status == OrderStatus.processing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Extraction is still running for this order")


def _apply(order: Order, clean: dict) -> None:
    for field, value in clean.items():
        setattr(order, field, value)
    # A human edit to a field resolves any extraction issue recorded for it.
    order.issues = {k: v for k, v in (order.issues or {}).items() if k not in clean}


# ---------------------------------------------------------------- extraction

def get_extractor():
    """Dependency so tests (or a different backend) can swap the extraction implementation."""
    return extract_order_fields


def run_extraction(order_id: int, data: bytes, media_type: str, extractor) -> None:
    """Runs after the upload response is sent. Uses its own DB session."""
    with SessionLocal() as db:
        order = db.get(Order, order_id)
        if order is None:  # deleted while processing
            return
        try:
            result = extractor(data, media_type)
        except ExtractionError as e:
            order.status = OrderStatus.failed
            order.error_message = e.message
            db.commit()
            return
        except Exception:
            log.exception("Unexpected extraction failure for order %s", order_id)
            order.status = OrderStatus.failed
            order.error_message = "Unexpected error while reading the document"
            db.commit()
            return

        clean, issues = validate_fields(result.values)
        # Show the reviewer exactly what was read when a value was rejected, so they can check it against the PDF.
        for name, error in list(issues.items()):
            if result.values.get(name):
                issues[name] = f'read "{result.values[name]}": {error}'
        for name, note in result.notes.items():
            if clean.get(name) is None and name not in issues:
                issues[name] = f"not extracted: {note}"
        for field, value in clean.items():
            setattr(order, field, value)
        order.issues = issues
        order.raw_extraction = result.raw
        order.error_message = None
        # Extracted data is never auto-approved: a person confirms it first.
        order.status = OrderStatus.needs_review
        db.commit()


def mark_interrupted_extractions(db: Session) -> None:
    """Background work does not survive a restart; surface it instead of leaving orders stuck."""
    db.execute(
        update(Order)
        .where(Order.status == OrderStatus.processing)
        .values(status=OrderStatus.failed, error_message="Interrupted by a server restart. Retry the extraction.")
    )
    db.commit()


def _require_configured(extractor) -> None:
    if extractor is extract_order_fields and not is_configured():
        key = "ANTHROPIC_API_KEY" if get_settings().extraction_provider == "anthropic" else "GEMINI_API_KEY"
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, f"Extraction is not configured ({key} missing)")


@router.post("/upload", response_model=OrderOut, status_code=status.HTTP_202_ACCEPTED)
def upload_order_pdf(
    background: BackgroundTasks,
    file: UploadFile = File(..., description="Order document: PDF (scanned or digital, up to 20 MB) or PNG/JPEG image (up to 5 MB)"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    extractor=Depends(get_extractor),
):
    """Create an order from a PDF or a PNG/JPEG image of the order.

    The file type is identified from its content, not its name. The file is checked and stored, and
    the order is returned at once with status `processing`.
    Extraction then runs in the background; poll `GET /orders/{id}` until the status changes to
    `needs_review` (or `failed`). Extracted values pass through the same validators as manual input:
    an invalid value is not saved (left null, reason in `issues`), and a field the document doesn't
    clearly contain is left null and listed in `missing_fields`. Nothing is guessed.
    """
    data = file.file.read(get_settings().max_upload_mb * 1024 * 1024 + 1)
    try:
        media_type, pages = check_document(data, file.filename)
    except ExtractionError as e:
        raise HTTPException(e.status_code, e.message)
    _require_configured(extractor)

    order = Order(
        owner_id=user.id,
        source_filename=(file.filename or "upload")[:255],
        document=data,
        document_pages=pages,
        document_type=media_type,
        status=OrderStatus.processing,
        issues={},
    )
    db.add(order)
    db.commit()
    background.add_task(run_extraction, order.id, data, media_type, extractor)
    return to_out(order)


@router.post("/{order_id}/retry", response_model=OrderOut, status_code=status.HTTP_202_ACCEPTED)
def retry_extraction(
    order_id: int,
    background: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    extractor=Depends(get_extractor),
):
    """Re-run extraction on the stored PDF (e.g. after a failure)."""
    order = get_owned_order(order_id, user, db)
    _ensure_editable(order)
    if not order.document:
        raise HTTPException(status.HTTP_409_CONFLICT, "This order has no source document")
    _require_configured(extractor)
    order.status = OrderStatus.processing
    order.error_message = None
    db.commit()
    background.add_task(run_extraction, order.id, order.document, order.document_type or PDF, extractor)
    return to_out(order)


@router.get("/{order_id}/document")
def get_document(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = get_owned_order(order_id, user, db)
    if not order.document:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This order has no source document")
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", order.source_filename or "order")
    return Response(
        order.document,
        media_type=order.document_type or PDF,
        headers={"Content-Disposition": f'inline; filename="{safe_name}"', "Cache-Control": "private, no-store"},
    )


# ---------------------------------------------------------------- CRUD

@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(body: OrderCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create an order by hand. It starts as `draft`; call `/orders/{id}/approve` to mark it ready."""
    clean = _validate_or_422(body.model_dump())
    order = Order(owner_id=user.id, issues={}, status=OrderStatus.draft, **clean)
    db.add(order)
    db.commit()
    return to_out(order)


def bucket(order: Order) -> str:
    """Group an order for the dashboard: processed, in_review or needs_attention."""
    if order.status == OrderStatus.ready:
        return "processed"
    if order.status == OrderStatus.failed:
        return "needs_attention"
    if order.status in (OrderStatus.needs_review, OrderStatus.draft) and (
        order.issues or missing_fields({f: getattr(order, f) for f in ORDER_FIELDS})
    ):
        return "needs_attention"
    return "in_review"


def _utc(ts: datetime) -> datetime:
    return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)  # SQLite returns naive UTC


@router.get("/stats", response_model=OrderStats)
def order_stats(
    days: int = Query(default=30, ge=1, le=365, description="Length of the reporting period in days"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """All-time counts by status, plus the last `days` days compared with the period before, and daily volume."""
    rows = db.execute(
        select(Order.status, func.count()).where(Order.owner_id == user.id).group_by(Order.status)
    ).all()
    counts = {s.value: 0 for s in OrderStatus}
    for s, n in rows:
        counts[s.value] = n

    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    prev_start = start - timedelta(days=days)
    recent = db.scalars(
        select(Order).where(Order.owner_id == user.id, Order.created_at >= prev_start)
    ).all()
    current, previous = PeriodCounts(), PeriodCounts()
    first_day = (now - timedelta(days=days - 1)).date()
    per_day = {first_day + timedelta(days=i): 0 for i in range(days)}
    for o in recent:
        created = _utc(o.created_at)
        period = current if created >= start else previous
        period.total += 1
        b = bucket(o)
        setattr(period, b, getattr(period, b) + 1)
        if created.date() in per_day:
            per_day[created.date()] += 1
    return OrderStats(
        total=sum(counts.values()),
        **counts,
        days=days,
        current=current,
        previous=previous,
        daily=[DailyCount(date=d, count=n) for d, n in per_day.items()],
    )


@router.get("", response_model=OrderList)
def list_orders(
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None, max_length=100, description="Search patient, provider, NPI, file name or GH- order number"),
    days: int | None = Query(default=None, ge=1, le=3650, description="Only orders created in the last N days"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Order).where(Order.owner_id == user.id)
    if status_filter:
        query = query.where(Order.status == status_filter)
    if days:
        query = query.where(Order.created_at >= datetime.now(timezone.utc) - timedelta(days=days))
    if q and q.strip():
        term = f"%{q.strip()}%"
        conds = [
            Order.patient_first_name.ilike(term),
            Order.patient_last_name.ilike(term),
            (Order.patient_first_name + " " + Order.patient_last_name).ilike(term),
            Order.provider_name.ilike(term),
            Order.provider_npi.like(term),
            Order.source_filename.ilike(term),
        ]
        m = re.fullmatch(r"\s*(?:(?:gh|ord)-?)?(\d{5,9})\s*", q, re.IGNORECASE)
        if m:
            conds.append(Order.id == int(m.group(1)) - ORDER_NUMBER_BASE)
        query = query.where(or_(*conds))
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(query.order_by(Order.id.desc()).limit(limit).offset(offset)).all()
    return OrderList(items=[to_out(o) for o in rows], total=total, limit=limit, offset=offset)


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return to_out(get_owned_order(order_id, user, db))


@router.patch("/{order_id}", response_model=OrderOut)
def update_order(
    order_id: int, body: OrderUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Edit fields and save without approving ("Save as Draft"). Any edit returns the order to `draft`."""
    order = get_owned_order(order_id, user, db)
    _ensure_editable(order)
    clean = _validate_or_422(body.model_dump(exclude_unset=True))
    _apply(order, clean)
    order.status = OrderStatus.draft
    db.commit()
    return to_out(order)


@router.post("/{order_id}/approve", response_model=OrderOut)
def approve_order(
    order_id: int,
    body: OrderUpdate | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save any field changes in the body and mark the order `ready` ("Approve & Save").

    Refused with 422 (and nothing saved) unless all five fields are present and valid.
    """
    order = get_owned_order(order_id, user, db)
    _ensure_editable(order)
    clean = _validate_or_422(body.model_dump(exclude_unset=True) if body else {})
    merged = {f: clean.get(f, getattr(order, f)) for f in ORDER_FIELDS}
    missing = missing_fields(merged)
    if missing:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            {"message": "Fill in every required field before approving", "missing": missing},
        )
    _apply(order, clean)
    order.issues = {}
    order.status = OrderStatus.ready
    db.commit()
    return to_out(order)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = get_owned_order(order_id, user, db)
    db.delete(order)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
