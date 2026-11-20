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

**Web app:** open `/` (served from `/app`). It has sign in and create account, a dashboard, an orders list
with search, status and date filters, multi-file PDF upload, and a review screen that shows the source PDF
next to the extracted fields. It's plain JavaScript in [`frontend/`](frontend/) with no build step.

Or open `/docs`, register, click **Authorize**, and try every endpoint from the browser.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create an account (8+ character password with a letter, number and symbol) |
| POST | `/auth/token` | Log in (OAuth2 password form) and get a bearer token |
| GET | `/auth/me` | Current user |
| POST | `/orders` | Create an order manually (starts as `draft`) |
| POST | `/orders/upload` | Upload a PDF â†’ `202` with status `processing`; extraction runs in the background |
| GET | `/orders?q=&status=&days=&limit=&offset=` | List and search your orders |
| GET | `/orders/stats` | Counts by status |
| GET / PATCH / DELETE | `/orders/{id}` | Read, edit (saves as `draft`), or delete one of your orders |
| POST | `/orders/{id}/approve` | Save any changes and mark `ready`. Refused unless all fields are present and valid |
| POST | `/orders/{id}/retry` | Re-run extraction on the stored PDF |
| GET | `/orders/{id}/document` | The original PDF (owner only) |

An order moves through these statuses:

`processing` â†’ `needs_review` (or `failed`) â†’ `draft` (saved, not approved) â†’ `ready` (approved by a person)

Extracted orders are **never auto-approved**. Even when every field passed validation, a person confirms
them against the source document first, because a wrong value means a denied claim. Editing an approved
order and saving it as a draft sends it back for approval.

## How extraction works and why it doesn't guess

1. **Pre-checks before any tokens are spent:** the file must be a PDF (checked by magic bytes), be no larger than 20 MB and 100 pages, and be neither encrypted nor corrupt.
2. **The model reads the PDF directly.** The default is **Gemini Flash** (`EXTRACTION_PROVIDER=gemini`, `GEMINI_MODEL`, default `gemini-3.8-flash`, because Google no longer offers `gemini-2.5-flash` to new API keys). It reads each page as text and as an image, so scanned faxes with no text layer, handwriting and multi-page packets work without a separate OCR step. It's fast and inexpensive for high-volume intake. Files over about 14 MB go through the Gemini Files API instead of inline upload. Overload, rate-limit and network errors are retried with backoff (2 s, 5 s, 12 s). Claude (`EXTRACTION_PROVIDER=anthropic`, `ANTHROPIC_MODEL`) is a drop-in alternative that uses the same prompt, schema and validation. The provider is a configuration choice, not a code change.
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
