"""PDF -> order fields, using a multimodal LLM that reads PDFs natively.

Both supported providers (Google Gemini, the default, and Anthropic Claude) read each page as text and as
an image, so scanned faxes with no text layer work without a separate OCR step. The model is constrained
to a fixed JSON schema and told to return null, not a guess, for anything that isn't clearly written.
Its output then goes through the same validators as manual input before anything is saved.
"""
import base64
import io
import json
import logging
import time
from dataclasses import dataclass, field

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
    values: dict                               # field -> raw string value or None
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

USER_PROMPT = "Extract the order fields from this document."


# ---------------------------------------------------------------- shared

PDF = "application/pdf"
IMAGE_TYPES = {b"\x89PNG\r\n\x1a\n": "image/png", b"\xff\xd8\xff": "image/jpeg"}
MAX_IMAGE_MB = 5  # the per-image limit for inline images on the model APIs


def sniff_type(data: bytes) -> str | None:
    """Identify the file by its magic bytes, never by its name or the client's Content-Type."""
    if data.lstrip()[:5] == b"%PDF-":
        return PDF
    for magic, media_type in IMAGE_TYPES.items():
        if data.startswith(magic):
            return media_type
    return None


def check_document(data: bytes, filename: str | None) -> tuple[str, int]:
    """Validate an upload before spending tokens. Returns (media_type, page_count)."""
    if len(data) == 0:
        raise ExtractionError("Uploaded file is empty")
    media_type = sniff_type(data)
    if media_type is None:
        raise ExtractionError("Unsupported file type. Upload a PDF, PNG or JPEG.")
    if media_type == PDF:
        return PDF, check_pdf(data, filename)
    if len(data) > MAX_IMAGE_MB * 1024 * 1024:
        raise ExtractionError(f"Images must be {MAX_IMAGE_MB} MB or smaller (PDFs up to {get_settings().max_upload_mb} MB)", 413)
    return media_type, 1


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


def is_configured() -> bool:
    s = get_settings()
    if s.extraction_provider == "anthropic":
        return bool(s.anthropic_api_key)
    return bool(s.gemini_api_key)


def _to_result(text: str | None) -> ExtractionResult:
    try:
        parsed = json.loads(text or "")
    except json.JSONDecodeError as e:
        raise ExtractionError("Extraction returned malformed output", 502) from e
    if not isinstance(parsed, dict):
        raise ExtractionError("Extraction returned malformed output", 502)
    values, notes = {}, {}
    for name in FIELDS:
        item = parsed.get(name) if isinstance(parsed.get(name), dict) else {}
        value = item.get("value")
        values[name] = value.strip() if isinstance(value, str) and value.strip() else None
        if item.get("note"):
            notes[name] = str(item["note"])
    return ExtractionResult(values=values, notes=notes, raw=parsed)


def extract_order_fields(data: bytes, media_type: str = PDF) -> ExtractionResult:
    provider = get_settings().extraction_provider
    if provider == "anthropic":
        return _extract_anthropic(data, media_type)
    if provider == "gemini":
        return _extract_gemini(data, media_type)
    raise ExtractionError(f"Unknown EXTRACTION_PROVIDER '{provider}'", 503)


# ---------------------------------------------------------------- Google Gemini (default)

# Inline request payloads are capped at about 20 MB, and base64 adds a third, so larger files go
# through the Files API instead.
GEMINI_INLINE_LIMIT = 14 * 1024 * 1024
GEMINI_RETRYABLE = {429, 500, 502, 503, 504}
GEMINI_RETRY_DELAYS = (2, 5, 12)  # seconds between attempts
GEMINI_BLOCKED = {"SAFETY", "PROHIBITED_CONTENT", "SPII", "BLOCKLIST", "RECITATION", "IMAGE_SAFETY"}


def _gemini_client():
    from google import genai
    from google.genai import types

    s = get_settings()
    if not s.gemini_api_key:
        raise ExtractionError("Extraction is not configured (GEMINI_API_KEY missing)", 503)
    return genai.Client(api_key=s.gemini_api_key, http_options=types.HttpOptions(timeout=180_000))


def _extract_gemini(data: bytes, media_type: str = PDF) -> ExtractionResult:
    from google.genai import errors, types

    s = get_settings()
    client = _gemini_client()
    uploaded = None
    try:
        if len(data) > GEMINI_INLINE_LIMIT:
            uploaded = client.files.upload(file=io.BytesIO(data), config={"mime_type": media_type})
            doc = uploaded
        else:
            doc = types.Part.from_bytes(data=data, mime_type=media_type)
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0,
            response_mime_type="application/json",
            response_json_schema=OUTPUT_SCHEMA,
        )
        # Retry transient overload/rate-limit responses with backoff; this runs in a background task.
        for attempt, delay in enumerate(GEMINI_RETRY_DELAYS + (None,)):
            try:
                response = client.models.generate_content(model=s.gemini_model, contents=[doc, USER_PROMPT], config=config)
                break
            except errors.APIError as e:
                if delay is None or e.code not in GEMINI_RETRYABLE:
                    raise
                log.warning("Gemini %s on attempt %d; retrying in %ss", e.code, attempt + 1, delay)
            except Exception as e:  # transport-level failure (DNS, connection reset, timeout)
                if delay is None:
                    log.error("Gemini unreachable: %r", e)
                    raise ExtractionError("Could not reach the extraction service", 502) from e
                log.warning("Gemini connection error on attempt %d (%r); retrying in %ss", attempt + 1, e, delay)
            time.sleep(delay)
    except errors.ClientError as e:
        log.error("Gemini client error %s: %s", e.code, e.message)
        if e.code == 429:
            raise ExtractionError("Extraction service is busy; try again shortly", 503) from e
        if e.code in (401, 403):
            raise ExtractionError("Extraction service rejected the API key", 503) from e
        raise ExtractionError(f"Extraction failed: {e.message}", 422) from e
    except errors.ServerError as e:
        log.error("Gemini server error %s: %s", e.code, e.message)
        raise ExtractionError("Extraction service is unavailable; try again shortly", 502) from e
    except errors.APIError as e:
        raise ExtractionError(f"Extraction failed: {e.message}", 502) from e
    except ExtractionError:
        raise
    except Exception as e:  # e.g. network failure during the Files API upload
        log.error("Gemini request failed: %r", e)
        raise ExtractionError("Could not reach the extraction service", 502) from e
    finally:
        if uploaded is not None:
            try:
                client.files.delete(name=uploaded.name)
            except Exception:  # best effort; Gemini also expires uploads after 48h
                log.warning("Could not delete uploaded file %s", getattr(uploaded, "name", "?"))

    feedback = getattr(response, "prompt_feedback", None)
    if feedback is not None and getattr(feedback, "block_reason", None):
        raise ExtractionError(f"The extraction model declined this document ({feedback.block_reason})", 422)
    candidates = response.candidates or []
    if not candidates:
        raise ExtractionError("Extraction returned no result", 502)
    reason = getattr(candidates[0].finish_reason, "name", str(candidates[0].finish_reason))
    if reason in GEMINI_BLOCKED:
        raise ExtractionError(f"The extraction model declined this document ({reason})", 422)
    if reason == "MAX_TOKENS":
        raise ExtractionError("Extraction output was truncated", 502)

    log.info("Gemini extraction done: model=%s usage=%s", s.gemini_model, response.usage_metadata)
    return _to_result(response.text)


# ---------------------------------------------------------------- Anthropic Claude (alternative)

def _anthropic_client():
    import anthropic

    s = get_settings()
    if not s.anthropic_api_key:
        raise ExtractionError("Extraction is not configured (ANTHROPIC_API_KEY missing)", 503)
    return anthropic.Anthropic(api_key=s.anthropic_api_key, timeout=180, max_retries=2)


def _extract_anthropic(data: bytes, media_type: str = PDF) -> ExtractionResult:
    import anthropic

    s = get_settings()
    client = _anthropic_client()
    encoded = base64.standard_b64encode(data).decode()
    source_block = (
        {"type": "document", "source": {"type": "base64", "media_type": PDF, "data": encoded}}
        if media_type == PDF
        else {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": encoded}}
    )
    try:
        response = client.beta.messages.create(
            model=s.anthropic_model,
            max_tokens=16000,
            system=SYSTEM_PROMPT,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            output_config={
                "effort": s.anthropic_effort,
                "format": {"type": "json_schema", "schema": OUTPUT_SCHEMA},
            },
            messages=[{
                "role": "user",
                "content": [source_block, {"type": "text", "text": USER_PROMPT}],
            }],
        )
    except anthropic.RateLimitError as e:
        raise ExtractionError("Extraction service is busy; try again shortly", 503) from e
    except anthropic.APIStatusError as e:
        log.error("Claude API error %s (request %s): %s", e.status_code, e.request_id, e.message)
        raise ExtractionError(f"Extraction failed: {e.message}", 502 if e.status_code >= 500 else 422) from e
    except anthropic.APIConnectionError as e:
        raise ExtractionError("Could not reach the extraction service", 502) from e

    if response.stop_reason == "refusal":
        raise ExtractionError("The extraction model declined to process this document", 422)
    if response.stop_reason == "max_tokens":
        raise ExtractionError("Extraction output was truncated", 502)

    log.info("Claude extraction done: model=%s usage=%s", response.model, response.usage)
    return _to_result(next((b.text for b in response.content if b.type == "text"), None))
