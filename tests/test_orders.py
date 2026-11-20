from tests.conftest import PASSWORD, VALID_NPI, auth_headers

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
    assert r.status_code == 200 and "GenHealth" in r.text
    js = client.get("/app/app.js")
    assert js.status_code == 200
    assert js.headers["cache-control"] == "no-cache"   # browsers revalidate, so no stale UI after changes


def test_requires_auth(client):
    assert client.get("/orders").status_code == 401
    assert client.post("/orders", json=FULL_ORDER).status_code == 401
    assert client.get("/orders", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_register_duplicate_and_bad_login(client):
    auth_headers(client)
    r = client.post("/auth/register", json={"email": "ALICE@example.com", "password": PASSWORD})
    assert r.status_code == 409
    r = client.post("/auth/token", data={"username": "alice@example.com", "password": "wrong-password"})
    assert r.status_code == 401


def test_wrong_password_and_unknown_email_get_same_error(client):
    auth_headers(client)
    wrong_pw = client.post("/auth/token", data={"username": "alice@example.com", "password": "nope-nope"})
    unknown = client.post("/auth/token", data={"username": "nobody@example.com", "password": PASSWORD})
    assert wrong_pw.status_code == unknown.status_code == 401
    assert wrong_pw.json() == unknown.json()   # no account enumeration


def test_register_validates_email_and_password(client):
    def reg(email, pw):
        return client.post("/auth/register", json={"email": email, "password": pw}).status_code
    assert reg("not-an-email", PASSWORD) == 422
    assert reg("a@example.com", "Sh0rt!") == 422          # too short
    assert reg("a@example.com", "password123") == 422     # no symbol
    assert reg("a@example.com", "password!!!") == 422     # no number
    assert reg("a@example.com", PASSWORD) == 201


def test_crud_and_approval(client):
    h = auth_headers(client)
    r = client.post("/orders", json=FULL_ORDER, headers=h)
    assert r.status_code == 201, r.text
    order = r.json()
    assert order["status"] == "draft"          # never auto-approved
    assert order["order_number"] == f"ORD-{10000 + order['id']}"
    oid = order["id"]

    r = client.post(f"/orders/{oid}/approve", headers=h)
    assert r.status_code == 200 and r.json()["status"] == "ready"

    # Editing an approved order sends it back to draft
    r = client.patch(f"/orders/{oid}", json={"provider_npi": None}, headers=h)
    assert r.status_code == 200
    assert r.json()["status"] == "draft"
    assert r.json()["missing_fields"] == ["provider_npi"]

    # Can't approve while a field is missing; nothing is saved
    r = client.post(f"/orders/{oid}/approve", json={"provider_name": "Someone Else"}, headers=h)
    assert r.status_code == 422
    assert r.json()["detail"]["missing"] == ["provider_npi"]
    assert client.get(f"/orders/{oid}", headers=h).json()["provider_name"] == "John Smith MD"

    # Approve & Save with the fix in the body
    r = client.post(f"/orders/{oid}/approve", json={"provider_npi": VALID_NPI}, headers=h)
    assert r.json()["status"] == "ready"

    assert client.get("/orders", headers=h).json()["total"] == 1
    assert client.delete(f"/orders/{oid}", headers=h).status_code == 204
    assert client.get(f"/orders/{oid}", headers=h).status_code == 404


def test_users_cannot_see_each_others_orders(client):
    alice = auth_headers(client, "alice@example.com")
    bob = auth_headers(client, "bob@example.com")
    oid = client.post("/orders", json=FULL_ORDER, headers=alice).json()["id"]

    assert client.get(f"/orders/{oid}", headers=bob).status_code == 404
    assert client.patch(f"/orders/{oid}", json={"patient_first_name": "X"}, headers=bob).status_code == 404
    assert client.post(f"/orders/{oid}/approve", headers=bob).status_code == 404
    assert client.get(f"/orders/{oid}/document", headers=bob).status_code == 404
    assert client.delete(f"/orders/{oid}", headers=bob).status_code == 404
    assert client.get("/orders", headers=bob).json()["total"] == 0
    assert client.get("/orders/stats", headers=bob).json()["total"] == 0
    assert client.get(f"/orders/{oid}", headers=alice).json()["patient_first_name"] == "Jane"


def test_manual_create_rejects_invalid_values(client):
    h = auth_headers(client)
    r = client.post("/orders", json={**FULL_ORDER, "provider_npi": "12345678"}, headers=h)
    assert r.status_code == 422
    assert "provider_npi" in r.json()["detail"]["issues"]

    r = client.post("/orders", json={**FULL_ORDER, "patient_dob": "2999-01-01"}, headers=h)
    assert r.status_code == 422
    assert "patient_dob" in r.json()["detail"]["issues"]


def test_search_filter_and_stats(client):
    h = auth_headers(client)
    a = client.post("/orders", json=FULL_ORDER, headers=h).json()
    client.post("/orders", json={**FULL_ORDER, "patient_first_name": "Mei", "patient_last_name": "Chen"}, headers=h)
    client.post(f"/orders/{a['id']}/approve", headers=h)

    def search(**params):
        return client.get("/orders", params=params, headers=h).json()["total"]
    assert search(q="mei") == 1
    assert search(q="jane doe") == 1
    assert search(q=a["order_number"]) == 1
    assert search(q=VALID_NPI[:6]) == 2
    assert search(status="ready") == 1
    assert search(days=30) == 2

    stats = client.get("/orders/stats", headers=h).json()
    assert stats == {"total": 2, "ready": 1, "needs_review": 0, "processing": 0, "draft": 1, "failed": 0}
