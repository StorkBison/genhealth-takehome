import io

from pypdf import PdfWriter

from app.main import app
from app.routers.orders import get_extractor
from app.services.extraction import ExtractionError, ExtractionResult
from tests.conftest import VALID_NPI, auth_headers


def make_pdf(pages: int = 1) -> bytes:
    w = PdfWriter()
    for _ in range(pages):
        w.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    w.write(buf)
    return buf.getvalue()


def fake_extractor(values: dict, notes: dict | None = None):
    def _extract(_data: bytes) -> ExtractionResult:
        return ExtractionResult(values=values, notes=notes or {}, raw={"fake": True})
    return lambda: _extract


def upload(client, headers, data=None, name="order.pdf", ctype="application/pdf"):
    return client.post("/orders/upload", headers=headers, files={"file": (name, data or make_pdf(), ctype)})


def test_upload_complete_document_is_ready(client):
    app.dependency_overrides[get_extractor] = fake_extractor({
        "patient_first_name": "Jane", "patient_last_name": "Doe", "patient_dob": "1950-04-12",
        "provider_name": "John Smith", "provider_npi": VALID_NPI,
    })
    r = upload(client, auth_headers(client))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["status"] == "ready"
    assert body["source_filename"] == "order.pdf"
    assert body["provider_npi"] == VALID_NPI


def test_upload_invalid_and_missing_values_are_not_saved(client):
    app.dependency_overrides[get_extractor] = fake_extractor(
        {
            "patient_first_name": "Jane", "patient_last_name": "Doe", "patient_dob": None,
            "provider_name": "John Smith", "provider_npi": "1234567890",  # bad check digit
        },
        notes={"patient_dob": "DOB field is blank on the form"},
    )
    r = upload(client, auth_headers(client))
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "needs_review"
    assert body["provider_npi"] is None
    assert body["patient_dob"] is None
    assert "check-digit" in body["issues"]["provider_npi"]
    assert "blank" in body["issues"]["patient_dob"]
    assert set(body["missing_fields"]) == {"patient_dob", "provider_npi"}


def test_review_fix_makes_order_ready(client):
    h = auth_headers(client)
    app.dependency_overrides[get_extractor] = fake_extractor({
        "patient_first_name": "Jane", "patient_last_name": "Doe", "patient_dob": "1950-04-12",
        "provider_name": "John Smith", "provider_npi": None,
    })
    oid = upload(client, h).json()["id"]
    r = client.patch(f"/orders/{oid}", json={"provider_npi": VALID_NPI}, headers=h)
    assert r.json()["status"] == "ready"


def test_upload_rejects_non_pdf(client):
    app.dependency_overrides[get_extractor] = fake_extractor({})
    r = upload(client, auth_headers(client), data=b"hello world", name="x.txt", ctype="text/plain")
    assert r.status_code == 422
    assert "not a PDF" in r.json()["detail"]


def test_upload_requires_auth(client):
    r = client.post("/orders/upload", files={"file": ("a.pdf", make_pdf(), "application/pdf")})
    assert r.status_code == 401


def test_extraction_failure_saves_nothing(client):
    def failing():
        def _extract(_):
            raise ExtractionError("Could not reach the extraction service", 502)
        return _extract
    app.dependency_overrides[get_extractor] = failing
    h = auth_headers(client)
    assert upload(client, h).status_code == 502
    assert client.get("/orders", headers=h).json()["total"] == 0
