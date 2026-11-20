# Order Intake Service

A REST API (Python / FastAPI) for durable medical equipment (DME) orders. Users create orders by hand or
upload a faxed/scanned order PDF. The service extracts the patient's name and date of birth and the
ordering provider's name and NPI, checks every value, and saves the order. Each user sees only their own orders.

**Live:** `<PUBLIC_URL>` (interactive docs at `/docs`)

## Quick start (local)

```bash
python -m venv .venv && . .venv/bin/activate      # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env                               # set ANTHROPIC_API_KEY and JWT_SECRET
uvicorn app.main:app --reload
pytest -q
```

## Using the API

```bash
BASE=http://localhost:8000
curl -X POST $BASE/auth/register -H 'Content-Type: application/json' \
     -d '{"email":"me@example.com","password":"password123"}'
TOKEN=$(curl -s -X POST $BASE/auth/token -d 'username=me@example.com&password=password123' | jq -r .access_token)

curl -X POST $BASE/orders/upload -H "Authorization: Bearer $TOKEN" -F "file=@sample_order.pdf"
curl $BASE/orders -H "Authorization: Bearer $TOKEN"
```

Or open `/docs`, register, click **Authorize**, and try every endpoint from the browser.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create an account (email and password, at least 8 characters) |
| POST | `/auth/token` | Log in (OAuth2 password form) and get a bearer token |
| GET | `/auth/me` | Current user |
| POST | `/orders` | Create an order manually |
| POST | `/orders/upload` | Create an order from a PDF (multipart field `file`) |
| GET | `/orders?status=&limit=&offset=` | List your orders |
| GET / PATCH / DELETE | `/orders/{id}` | Read, partially update, or delete one of your orders |

An order has a `status`:
- `ready`: all five fields are present and valid.
- `needs_review`: created from a PDF, but something is missing or failed validation. See `missing_fields` and `issues`.
- `draft`: created by hand and not complete yet.

A `PATCH` that fixes a field clears the issue for it, and the status is recalculated.

## How extraction works and why it doesn't guess

1. **Pre-checks before any tokens are spent:** the file must be a PDF (checked by magic bytes), be no larger than 20 MB and 100 pages, and be neither encrypted nor corrupt.
2. **Claude reads the PDF directly.** Each page goes to the model as text and as an image, so scanned faxes with no text layer, handwriting and multi-page packets work without a separate OCR step. The model is `claude-opus-5-5`, configurable with `EXTRACTION_MODEL`.
3. **Constrained output.** The response must match a JSON schema. For each field the model returns `value`, the `source_text` it read the value from, and a `note`. The prompt explains the cost of errors: a wrong value means a denied claim, while a missing one only means a person reviews it. It tells the model to return `null` rather than infer, complete or pick between ambiguous candidates (for example several NPIs, or a two-digit birth year). It also says which person is the patient and which is the ordering provider, and lists the look-alikes to ignore: caregiver, insurance subscriber, DME supplier, group NPI, fax sender.
4. **Deterministic validation before saving.** Manual input and extracted input go through the same validators:
   - **NPI:** exactly 10 digits, starting with 1 or 2, and passing the CMS Luhn check digit (with the `80840` prefix). This catches most misread or invented digits.
   - **DOB:** a real ISO date, not in the future and not before 1900. Other formats are rejected rather than guessed (`03/04/05`, for example).
   - **Names:** whitespace is normalized, characters and length are checked.

   Manual input that fails is rejected with a 422. An extracted value that fails is **not saved**: the field stays `null`, the reason goes in `issues`, and the order becomes `needs_review`.
5. **Audit trail.** The raw model output, including `source_text`, is stored in `raw_extraction` on the order.
6. **Failures save nothing.** If the API is unreachable, the model refuses, or the output is malformed, the request gets a clear 4xx/5xx and no half-filled order is written.

## Security

- Passwords are hashed with bcrypt. Auth uses HS256 JWT bearer tokens that expire after 12 hours.
- Every order query filters on `owner_id`. Another user's order returns **404**, not 403, so order IDs can't be probed across accounts.
- In production, the app refuses to start without a strong `JWT_SECRET`.
- The container runs as a non-root user.

## Deployment

The service runs in Docker (`Dockerfile`). `render.yaml` is a Render blueprint: it creates the web service and a
Postgres database, generates `JWT_SECRET`, and asks you for `ANTHROPIC_API_KEY`. Locally the app uses SQLite. Set
`DATABASE_URL` to use Postgres; `postgres://` URLs are normalized automatically.

## What I'd do next (left out to stay in the 3-hour timebox)

- Alembic migrations instead of `create_all` on boot.
- Async extraction (a job queue with a `processing` status) so large packets don't keep an HTTP request open.
- Keep the original PDF in object storage, linked to the order.
- Check the NPI and provider name against the public NPPES registry.
- An eval set of labeled real and synthetic faxes to measure per-field accuracy and tune the prompt, model and effort.
- Rate limiting, refresh tokens, and structured logging with request IDs. Avoid logging PHI.

## AI usage

I built this with Claude Code. The exported agent session is in [`agent-sessions/`](agent-sessions/).
