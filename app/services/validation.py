"""Field-level checks applied to every value before it is saved, whether typed by a user or extracted by the LLM.

Rule: an invalid value is never "fixed up" or guessed. It is dropped (stored as NULL) and the reason is
recorded in `issues`, so a human can review it.
"""
import re
from datetime import date

REQUIRED_FIELDS = (
    "patient_first_name",
    "patient_last_name",
    "patient_dob",
    "provider_name",
    "provider_npi",
)

_NAME_RE = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ .,'\-]*$")


def validate_name(value: str | None, max_len: int) -> tuple[str | None, str | None]:
    if value is None:
        return None, None
    v = " ".join(value.split())
    if not v:
        return None, None
    if len(v) > max_len:
        return None, f"longer than {max_len} characters"
    if not _NAME_RE.match(v):
        return None, "contains characters not expected in a name"
    return v, None


def validate_npi(value: str | None) -> tuple[str | None, str | None]:
    if value is None:
        return None, None
    v = re.sub(r"[\s\-]", "", str(value))
    if not v:
        return None, None
    if not re.fullmatch(r"\d{10}", v):
        return None, "NPI must be exactly 10 digits"
    return v, None


def validate_dob(value: date | str | None, today: date | None = None) -> tuple[date | None, str | None]:
    if value is None or value == "":
        return None, None
    today = today or date.today()
    if isinstance(value, str):
        try:
            value = date.fromisoformat(value.strip())
        except ValueError:
            return None, "date of birth is not a valid YYYY-MM-DD date"
    if value > today:
        return None, "date of birth is in the future"
    if value.year < 1900:
        return None, "date of birth is before 1900"
    return value, None


def validate_fields(data: dict) -> tuple[dict, dict]:
    """Validate the order fields present in `data`.

    Returns (clean_values, issues). Keys absent from `data` are left untouched (supports PATCH).
    """
    clean: dict = {}
    issues: dict = {}
    checks = {
        "patient_first_name": lambda v: validate_name(v, 100),
        "patient_last_name": lambda v: validate_name(v, 100),
        "provider_name": lambda v: validate_name(v, 200),
        "provider_npi": validate_npi,
        "patient_dob": validate_dob,
    }
    for field, check in checks.items():
        if field not in data:
            continue
        value, error = check(data[field])
        clean[field] = value
        if error:
            issues[field] = error
    return clean, issues


def missing_fields(values: dict) -> list[str]:
    return [f for f in REQUIRED_FIELDS if values.get(f) in (None, "")]
