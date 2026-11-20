from tests.conftest import VALID_NPI, auth_headers

FULL_ORDER = {
    "patient_first_name": "Jane",
    "patient_last_name": "Doe",
    "patient_dob": "1950-04-12",
    "provider_name": "John Smith MD",
    "provider_npi": VALID_NPI,
}


def test_frontend_is_served(client):
    r = client.get("/", follow_redirects=False)
    assert r.headers["location"] == "/app/"
    r = client.get("/app/")
    assert r.status_code == 200 and "Order Intake" in r.text
    assert client.get("/app/app.js").status_code == 200


def test_wrong_password_and_unknown_email_get_same_error(client):
    auth_headers(client)
    wrong_pw = client.post("/auth/token", data={"username": "alice@example.com", "password": "nope-nope"})
    unknown = client.post("/auth/token", data={"username": "nobody@example.com", "password": "password123"})
    assert wrong_pw.status_code == unknown.status_code == 401
    assert wrong_pw.json() == unknown.json()   # no account enumeration


def test_register_validates_email_and_password(client):
    assert client.post("/auth/register", json={"email": "not-an-email", "password": "password123"}).status_code == 422
    assert client.post("/auth/register", json={"email": "a@example.com", "password": "short"}).status_code == 422


def test_requires_auth(client):
    assert client.get("/orders").status_code == 401
    assert client.post("/orders", json=FULL_ORDER).status_code == 401
    assert client.get("/orders", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_register_duplicate_and_bad_login(client):
    auth_headers(client)
    r = client.post("/auth/register", json={"email": "ALICE@example.com", "password": "password123"})
    assert r.status_code == 409
    r = client.post("/auth/token", data={"username": "alice@example.com", "password": "wrong-password"})
    assert r.status_code == 401


def test_crud_roundtrip(client):
    h = auth_headers(client)
    r = client.post("/orders", json=FULL_ORDER, headers=h)
    assert r.status_code == 201, r.text
    order = r.json()
    assert order["status"] == "ready"
    assert order["missing_fields"] == []

    oid = order["id"]
    assert client.get(f"/orders/{oid}", headers=h).json()["patient_last_name"] == "Doe"

    r = client.patch(f"/orders/{oid}", json={"provider_npi": None}, headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "draft"
    assert r.json()["missing_fields"] == ["provider_npi"]

    listing = client.get("/orders", headers=h).json()
    assert listing["total"] == 1

    assert client.delete(f"/orders/{oid}", headers=h).status_code == 204
    assert client.get(f"/orders/{oid}", headers=h).status_code == 404


def test_users_cannot_see_each_others_orders(client):
    alice = auth_headers(client, "alice@example.com")
    bob = auth_headers(client, "bob@example.com")
    oid = client.post("/orders", json=FULL_ORDER, headers=alice).json()["id"]

    assert client.get(f"/orders/{oid}", headers=bob).status_code == 404
    assert client.patch(f"/orders/{oid}", json={"patient_first_name": "X"}, headers=bob).status_code == 404
    assert client.delete(f"/orders/{oid}", headers=bob).status_code == 404
    assert client.get("/orders", headers=bob).json()["total"] == 0
    # Alice's order is untouched
    assert client.get(f"/orders/{oid}", headers=alice).json()["patient_first_name"] == "Jane"


def test_manual_create_rejects_invalid_values(client):
    h = auth_headers(client)
    r = client.post("/orders", json={**FULL_ORDER, "provider_npi": "1234567890"}, headers=h)
    assert r.status_code == 422
    assert "provider_npi" in r.json()["detail"]["issues"]

    r = client.post("/orders", json={**FULL_ORDER, "patient_dob": "2999-01-01"}, headers=h)
    assert r.status_code == 422
    assert "patient_dob" in r.json()["detail"]["issues"]
