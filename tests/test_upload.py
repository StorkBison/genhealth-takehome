import io

from pypdf import PdfWriter

from app.main import app
from app.routers.orders import get_extractor
from app.services.extraction import ExtractionError, ExtractionResult
from tests.conftest import VALID_NPI, auth_headers

COMPLETE = {
    "patient_first_name": "Jane", "patient_last_name": "Doe", "patient_dob": "1950-04-12",
    "provider_name": "John Smith", "provider_npi": VALID_NPI,
}


def make_pdf(pages: int = 1) -> bytes:
    w = PdfWriter()
    for _ in range(pages):
        w.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    w.write(buf)
    return buf.getvalue()


def fake_extractor(values: dict, notes: dict | None = None):
    def _extract(_data: bytes) -> ExtractionResult:
        raw = {k: {"value": v, "source_text": v, "note": (notes or {}).get(k)} for k, v in values.items()}
        return ExtractionResult(values=values, notes=notes or {}, raw=raw)
    return lambda: _extract


def upload(client, headers, data=None, name="order.pdf", ctype="application/pdf"):
    return client.post("/orders/upload", headers=headers, files={"file": (name, data or make_pdf(), ctype)})


def test_upload_is_async_and_lands_in_needs_review(client):
    app.dependency_overrides[get_extractor] = fake_extractor(COMPLETE)
    h = auth_headers(client)
    r = upload(client, h, data=make_pdf(3))
    assert r.status_code == 202, r.text
    body = r.json()
    assert body["status"] == "processing"
    assert body["document_pages"] == 3 and body["has_document"]

    # TestClient runs background tasks before returning, so extraction has finished now
    order = client.get(f"/orders/{body['id']}", headers=h).json()
    assert order["status"] == "needs_review"      # complete, but a person still approves it
    assert order["missing_fields"] == []
    assert order["sources"]["patient_last_name"] == "Doe"
    assert order["raw_extraction"]["provider_npi"]["value"] == VALID_NPI

    assert client.post(f"/orders/{body['id']}/approve", headers=h).json()["status"] == "ready"


def test_source_document_is_stored_and_owner_only(client):
    app.dependency_overrides[get_extractor] = fake_extractor(COMPLETE)
    h = auth_headers(client)
    pdf = make_pdf()
    oid = upload(client, h, data=pdf).json()["id"]
    r = client.get(f"/orders/{oid}/document", headers=h)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content == pdf
    other = auth_headers(client, "eve@example.com")
    assert client.get(f"/orders/{oid}/document", headers=other).status_code == 404


def test_invalid_and_missing_values_are_not_saved(client):
    app.dependency_overrides[get_extractor] = fake_extractor(
        {**COMPLETE, "patient_dob": None, "provider_npi": "1234567890"},  # bad check digit
        notes={"patient_dob": "DOB field is blank on the form"},
    )
    h = auth_headers(client)
    oid = upload(client, h).json()["id"]
    body = client.get(f"/orders/{oid}", headers=h).json()
    assert body["status"] == "needs_review"
    assert body["provider_npi"] is None
    assert body["patient_dob"] is None
    assert "check-digit" in body["issues"]["provider_npi"]
    assert '"1234567890"' in body["issues"]["provider_npi"]   # reviewer sees what was rejected
    assert "blank" in body["issues"]["patient_dob"]
    assert set(body["missing_fields"]) == {"patient_dob", "provider_npi"}

    # Approve is refused until a person fills the gaps
    assert client.post(f"/orders/{oid}/approve", headers=h).status_code == 422
    r = client.post(f"/orders/{oid}/approve", json={"patient_dob": "1950-04-12", "provider_npi": VALID_NPI}, headers=h)
    assert r.json()["status"] == "ready"
    assert r.json()["issues"] == {}


def test_sample_style_invalid_npi_is_flagged_not_saved(client):
    # Mirrors the provided sample order: prescriber NPI 9182734556 is not a valid NPI.
    app.dependency_overrides[get_extractor] = fake_extractor({
        "patient_first_name": "Marie", "patient_last_name": "Curie", "patient_dob": "1900-12-05",
        "provider_name": "Arjun Raj", "provider_npi": "9182734556",
    })
    h = auth_headers(client)
    oid = upload(client, h).json()["id"]
    body = client.get(f"/orders/{oid}", headers=h).json()
    assert body["patient_dob"] == "1900-12-05"
    assert body["provider_npi"] is None
    assert body["issues"]["provider_npi"] == 'read "9182734556": NPI must start with 1 or 2'
    assert body["status"] == "needs_review"


def test_upload_rejects_non_pdf(client):
    app.dependency_overrides[get_extractor] = fake_extractor({})
    r = upload(client, auth_headers(client), data=b"hello world", name="x.txt", ctype="text/plain")
    assert r.status_code == 422
    assert "not a PDF" in r.json()["detail"]


def test_upload_requires_auth(client):
    r = client.post("/orders/upload", files={"file": ("a.pdf", make_pdf(), "application/pdf")})
    assert r.status_code == 401


def test_extraction_failure_marks_order_failed_and_can_retry(client):
    def failing():
        def _extract(_):
            raise ExtractionError("Could not reach the extraction service", 502)
        return _extract
    app.dependency_overrides[get_extractor] = failing
    h = auth_headers(client)
    oid = upload(client, h).json()["id"]
    order = client.get(f"/orders/{oid}", headers=h).json()
    assert order["status"] == "failed"
    assert "Could not reach" in order["error_message"]

    app.dependency_overrides[get_extractor] = fake_extractor(COMPLETE)
    assert client.post(f"/orders/{oid}/retry", headers=h).status_code == 202
    order = client.get(f"/orders/{oid}", headers=h).json()
    assert order["status"] == "needs_review" and order["error_message"] is None


def test_cannot_edit_while_processing(client):
    from app.database import SessionLocal
    from app.models import Order, OrderStatus
    h = auth_headers(client)
    oid = client.post("/orders", json={}, headers=h).json()["id"]
    with SessionLocal() as db:
        db.get(Order, oid).status = OrderStatus.processing
        db.commit()
    assert client.patch(f"/orders/{oid}", json={"patient_first_name": "X"}, headers=h).status_code == 409
