import json
from types import SimpleNamespace

import pytest

from app.services import extraction
from app.services.extraction import ExtractionError, extract_order_fields

PAYLOAD = {
    "patient_first_name": {"value": "Jane", "source_text": "DOE, JANE", "note": None},
    "patient_last_name": {"value": "Doe", "source_text": "DOE, JANE", "note": None},
    "patient_dob": {"value": None, "source_text": None, "note": "illegible"},
    "provider_name": {"value": "  John Smith ", "source_text": "John Smith, MD", "note": None},
    "provider_npi": {"value": "", "source_text": None, "note": None},
}
EXPECTED = {
    "patient_first_name": "Jane", "patient_last_name": "Doe", "patient_dob": None,
    "provider_name": "John Smith", "provider_npi": None,
}


@pytest.fixture
def settings(monkeypatch):
    s = extraction.get_settings()
    monkeypatch.setattr(s, "gemini_api_key", "test-key")
    monkeypatch.setattr(s, "anthropic_api_key", "test-key")
    return s


# ---------------------------------------------------------------- Gemini

def _gemini(finish="STOP", payload=PAYLOAD, block=None, capture=None):
    def generate_content(**kwargs):
        if capture is not None:
            capture.update(kwargs)
        return SimpleNamespace(
            prompt_feedback=SimpleNamespace(block_reason=block) if block else None,
            candidates=[SimpleNamespace(finish_reason=SimpleNamespace(name=finish))],
            usage_metadata={},
            text=json.dumps(payload),
        )
    return SimpleNamespace(models=SimpleNamespace(generate_content=generate_content))


def test_gemini_is_default_and_parses_output(monkeypatch, settings):
    monkeypatch.setattr(settings, "extraction_provider", "gemini")
    sent = {}
    monkeypatch.setattr(extraction, "_gemini_client", lambda: _gemini(capture=sent))
    result = extract_order_fields(b"%PDF-1.4 fake")
    assert result.values == EXPECTED
    assert result.notes == {"patient_dob": "illegible"}
    assert sent["model"] == settings.gemini_model
    pdf_part = sent["contents"][0]
    assert pdf_part.inline_data.mime_type == "application/pdf"
    assert sent["config"].response_mime_type == "application/json"
    assert sent["config"].temperature == 0


@pytest.mark.parametrize("finish", ["SAFETY", "SPII", "PROHIBITED_CONTENT"])
def test_gemini_blocked_raises(monkeypatch, settings, finish):
    monkeypatch.setattr(settings, "extraction_provider", "gemini")
    monkeypatch.setattr(extraction, "_gemini_client", lambda: _gemini(finish=finish))
    with pytest.raises(ExtractionError) as e:
        extract_order_fields(b"%PDF-1.4 fake")
    assert finish in e.value.message


def test_gemini_truncated_and_malformed(monkeypatch, settings):
    monkeypatch.setattr(settings, "extraction_provider", "gemini")
    monkeypatch.setattr(extraction, "_gemini_client", lambda: _gemini(finish="MAX_TOKENS"))
    with pytest.raises(ExtractionError):
        extract_order_fields(b"%PDF-1.4 fake")
    monkeypatch.setattr(extraction, "_gemini_client", lambda: _gemini(payload=["not", "an", "object"]))
    with pytest.raises(ExtractionError):
        extract_order_fields(b"%PDF-1.4 fake")


def test_gemini_retries_transient_errors(monkeypatch, settings):
    from google.genai import errors
    monkeypatch.setattr(settings, "extraction_provider", "gemini")
    monkeypatch.setattr(extraction, "GEMINI_RETRY_DELAYS", (0, 0))
    monkeypatch.setattr(extraction.time, "sleep", lambda s: None)
    ok = _gemini()
    calls = {"n": 0}

    def flaky(**kwargs):
        calls["n"] += 1
        if calls["n"] == 1:
            raise errors.ServerError(503, {"error": {"code": 503, "message": "overloaded", "status": "UNAVAILABLE"}})
        if calls["n"] == 2:
            raise ConnectionError("getaddrinfo failed")
        return ok.models.generate_content(**kwargs)

    monkeypatch.setattr(extraction, "_gemini_client", lambda: SimpleNamespace(models=SimpleNamespace(generate_content=flaky)))
    assert extract_order_fields(b"%PDF-1.4 fake").values == EXPECTED
    assert calls["n"] == 3


def test_gemini_gives_up_after_retries(monkeypatch, settings):
    monkeypatch.setattr(settings, "extraction_provider", "gemini")
    monkeypatch.setattr(extraction, "GEMINI_RETRY_DELAYS", (0,))
    monkeypatch.setattr(extraction.time, "sleep", lambda s: None)

    def down(**kwargs):
        raise ConnectionError("getaddrinfo failed")

    monkeypatch.setattr(extraction, "_gemini_client", lambda: SimpleNamespace(models=SimpleNamespace(generate_content=down)))
    with pytest.raises(ExtractionError) as e:
        extract_order_fields(b"%PDF-1.4 fake")
    assert e.value.status_code == 502 and "reach" in e.value.message


def test_gemini_missing_key_is_503(monkeypatch, settings):
    monkeypatch.setattr(settings, "extraction_provider", "gemini")
    monkeypatch.setattr(settings, "gemini_api_key", None)
    assert not extraction.is_configured()
    with pytest.raises(ExtractionError) as e:
        extract_order_fields(b"%PDF-1.4 fake")
    assert e.value.status_code == 503 and "GEMINI_API_KEY" in e.value.message


# ---------------------------------------------------------------- Claude

def _claude(stop_reason="end_turn", capture=None):
    def create(**kwargs):
        if capture is not None:
            capture.update(kwargs)
        return SimpleNamespace(stop_reason=stop_reason, model="claude-opus-5-5", usage={},
                               content=[SimpleNamespace(type="text", text=json.dumps(PAYLOAD))])
    return SimpleNamespace(beta=SimpleNamespace(messages=SimpleNamespace(create=create)))


def test_claude_provider_parses_output(monkeypatch, settings):
    monkeypatch.setattr(settings, "extraction_provider", "anthropic")
    sent = {}
    monkeypatch.setattr(extraction, "_anthropic_client", lambda: _claude(capture=sent))
    assert extract_order_fields(b"%PDF-1.4 fake").values == EXPECTED
    assert sent["messages"][0]["content"][0]["source"]["media_type"] == "application/pdf"


def test_claude_refusal_raises(monkeypatch, settings):
    monkeypatch.setattr(settings, "extraction_provider", "anthropic")
    monkeypatch.setattr(extraction, "_anthropic_client", lambda: _claude(stop_reason="refusal"))
    with pytest.raises(ExtractionError):
        extract_order_fields(b"%PDF-1.4 fake")
