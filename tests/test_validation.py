from datetime import date

from app.services.validation import missing_fields, npi_checksum_ok, validate_dob, validate_fields, validate_npi


def test_npi_checksum():
    assert npi_checksum_ok("1234567893")       # CMS documentation example
    assert not npi_checksum_ok("1234567890")
    assert not npi_checksum_ok("123456789")


def test_npi_normalizes_formatting():
    assert validate_npi("123-456-7893") == ("1234567893", None)
    assert validate_npi("12345 67893")[0] == "1234567893"
    assert validate_npi("abc")[0] is None
    assert validate_npi("3234567893")[1] == "NPI must start with 1 or 2"


def test_dob():
    today = date(2026, 1, 1)
    assert validate_dob("1950-04-12", today) == (date(1950, 4, 12), None)
    assert validate_dob("2027-01-01", today)[0] is None
    assert validate_dob("04/12/1950", today)[0] is None   # only ISO accepted; no guessing day/month order
    assert validate_dob("1850-01-01", today)[0] is None


def test_missing_is_not_guessed():
    clean, issues = validate_fields({"patient_first_name": None, "provider_name": "   "})
    assert clean == {"patient_first_name": None, "provider_name": None}
    assert issues == {}
    assert set(missing_fields(clean)) == {
        "patient_first_name", "patient_last_name", "patient_dob", "provider_name", "provider_npi"
    }


def test_name_rejects_junk():
    _, issues = validate_fields({"patient_last_name": "Doe; DROP TABLE"})
    assert "patient_last_name" in issues
