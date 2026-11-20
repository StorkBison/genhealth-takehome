import json
from types import SimpleNamespace

import pytest

from app.services import extraction
from app.services.extraction import ExtractionError, extract_order_fields


def _fake_client(stop_reason="end_turn", payload=None, capture=None):
    def create(**kwargs):
        if capture is not None:
            capture.update(kwargs)
        return SimpleNamespace(
            stop_reason=stop_reason,
            model="claude-opus-5-5",
            usage={},
            content=[SimpleNamespace(type="text", text=json.dumps(payload or {}))],
        )
    return SimpleNamespace(beta=SimpleNamespace(messages=SimpleNamespace(create=create)))


def _field(value, note=None):
    return {"value": value, "source_text": value, "note": note}


def test_parses_model_output_and_sends_pdf(monkeypatch):
    sent = {}
    payload = {
        "patient_first_name": _field("Jane"),
        "patient_last_name": _field("Doe"),
        "patient_dob": _field(None, "illegible"),
        "provider_name": _field("  John Smith "),
        "provider_npi": _field(""),
    }
    monkeypatch.setattr(extraction, "_client", lambda: _fake_client(payload=payload, capture=sent))
    result = extract_order_fields(b"%PDF-1.4 fake")

    assert result.values == {
        "patient_first_name": "Jane", "patient_last_name": "Doe", "patient_dob": None,
        "provider_name": "John Smith", "provider_npi": None,
    }
    assert result.notes == {"patient_dob": "illegible"}
    doc = sent["messages"][0]["content"][0]
    assert doc["type"] == "document" and doc["source"]["media_type"] == "application/pdf"
    assert sent["output_config"]["format"]["type"] == "json_schema"


def test_refusal_raises(monkeypatch):
    monkeypatch.setattr(extraction, "_client", lambda: _fake_client(stop_reason="refusal"))
    with pytest.raises(ExtractionError):
        extract_order_fields(b"%PDF-1.4 fake")


def test_missing_api_key_is_503(monkeypatch):
    monkeypatch.setattr(extraction.get_settings(), "anthropic_api_key", None)
    with pytest.raises(ExtractionError) as e:
        extract_order_fields(b"%PDF-1.4 fake")
    assert e.value.status_code == 503
