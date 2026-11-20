"""PDF -> order fields, using Claude's native PDF understanding.

Claude reads each page both as text and as an image, so scanned faxes with no text layer work
without a separate OCR step. The model is asked for JSON matching a fixed schema and told to return
null (not a guess) for anything that isn't clearly written. Its output is then run through the same
validators as manual input before anything is saved.
"""
import base64
import io
import json
import logging
from dataclasses import dataclass, field

import anthropic
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.config import get_settings

log = logging.getLogger(__name__)

FIELDS = ("patient_first_name", "patient_last_name", "patient_dob", "provider_name", "provider_npi")


class ExtractionError(Exception):
    """The document could not be processed; nothing should be saved."""

    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass
class ExtractionResult:
    values: dict                      # field -> raw string value or None
    notes: dict = field(default_factory=dict)  # field -> model's note (e.g. why it returned null)
    raw: dict = field(default_factory=dict)    # full model output, stored for audit


def _nullable_str():
    return {"anyOf": [{"type": "string"}, {"type": "null"}]}


def _field_schema():
    return {
        "type": "object",
        "properties": {
            "value": _nullable_str(),
            "source_text": _nullable_str(),
            "note": _nullable_str(),
        },
        "required": ["value", "source_text", "note"],
        "additionalProperties": False,
    }


OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {name: _field_schema() for name in FIELDS},
    "required": list(FIELDS),
    "additionalProperties": False,
}

SYSTEM_PROMPT = """You extract data from durable medical equipment (DME) orders: faxed or scanned \
prescriptions, certificates of medical necessity, referral packets and similar documents. They are \
often messy: multiple pages, cover sheets, handwriting, stamps, skewed scans, and several people named.

Your output is entered into a medical billing system, where a wrong value causes a denied claim or a \
delayed patient. A missing value is safe, because a person reviews it. So:
- Only report a value that is written in the document. Never infer, complete, or "fix" a value.
- If a field is absent, illegible, cut off, or you are not sure which of several candidates is correct, \
return null for value and explain briefly in note.
- source_text is the exact text you read the value from, as it appears in the document (null if value is null).

Fields:
- patient_first_name / patient_last_name: the patient the equipment is for. Not a caregiver, insurance \
subscriber, emergency contact or the provider. If the name appears as "LAST, FIRST", split it correctly. \
Leave out titles and suffixes, and don't include middle names or initials in first name.
- patient_dob: the patient's date of birth, normalized to YYYY-MM-DD. If the written date is ambiguous \
(for example a two-digit year that could be 19xx or 20xx with no other clue, or day/month order that \
can't be determined), return null and explain in note.
- provider_name: the ordering/prescribing provider (physician, NP or PA) who signed or ordered the \
equipment. Not the DME supplier, the fax sender, or a referring clinic name, unless that is clearly the \
ordering provider. Give the person's name as written, without credentials such as MD, DO, NP.
- provider_npi: the ordering provider's 10-digit National Provider Identifier, digits only. Not a \
supplier NPI, group NPI, Medicare/Medicaid ID, DEA, tax ID or phone number. If several NPIs appear and \
you cannot tell which belongs to the ordering provider, return null."""


def check_pdf(data: bytes, filename: str | None) -> int:
    """Reject non-PDFs, oversized, encrypted or unreadable files before spending tokens. Returns page count."""
    s = get_settings()
    if len(data) == 0:
        raise ExtractionError("Uploaded file is empty")
    if len(data) > s.max_upload_mb * 1024 * 1024:
        raise ExtractionError(f"File exceeds {s.max_upload_mb} MB limit", 413)
    if not data.lstrip()[:5] == b"%PDF-":
        raise ExtractionError("File is not a PDF")
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise ExtractionError("PDF is password-protected")
        pages = len(reader.pages)
    except PdfReadError as e:
        raise ExtractionError(f"PDF could not be read: {e}") from e
    if pages == 0:
        raise ExtractionError("PDF has no pages")
    if pages > s.max_pdf_pages:
        raise ExtractionError(f"PDF has {pages} pages; the limit is {s.max_pdf_pages}", 413)
    return pages


def _client() -> anthropic.Anthropic:
    s = get_settings()
    if not s.anthropic_api_key:
        raise ExtractionError("Extraction is not configured (ANTHROPIC_API_KEY missing)", 503)
    return anthropic.Anthropic(api_key=s.anthropic_api_key, timeout=180, max_retries=2)


def extract_order_fields(data: bytes) -> ExtractionResult:
    s = get_settings()
    client = _client()
    try:
        response = client.beta.messages.create(
            model=s.extraction_model,
            max_tokens=16000,
            system=SYSTEM_PROMPT,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            output_config={
                "effort": s.extraction_effort,
                "format": {"type": "json_schema", "schema": OUTPUT_SCHEMA},
            },
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": base64.standard_b64encode(data).decode(),
                            },
                        },
                        {"type": "text", "text": "Extract the order fields from this document."},
                    ],
                }
            ],
        )
    except anthropic.RateLimitError as e:
        raise ExtractionError("Extraction service is busy; try again shortly", 503) from e
    except anthropic.APIStatusError as e:
        log.error("Claude API error %s (request %s): %s", e.status_code, e.request_id, e.message)
        status = 502 if e.status_code >= 500 else 422
        raise ExtractionError(f"Extraction failed: {e.message}", status) from e
    except anthropic.APIConnectionError as e:
        raise ExtractionError("Could not reach the extraction service", 502) from e

    if response.stop_reason == "refusal":
        raise ExtractionError("The extraction model declined to process this document", 422)
    if response.stop_reason == "max_tokens":
        raise ExtractionError("Extraction output was truncated", 502)

    text = next((b.text for b in response.content if b.type == "text"), None)
    try:
        parsed = json.loads(text or "")
    except json.JSONDecodeError as e:
        raise ExtractionError("Extraction returned malformed output", 502) from e

    values, notes = {}, {}
    for name in FIELDS:
        item = parsed.get(name) or {}
        value = item.get("value")
        values[name] = value.strip() if isinstance(value, str) and value.strip() else None
        if item.get("note"):
            notes[name] = item["note"]
    log.info("Extraction done: model=%s usage=%s", response.model, response.usage)
    return ExtractionResult(values=values, notes=notes, raw=parsed)
