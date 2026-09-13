# Service.Hub — Backend

FastAPI service implementing:
1. **Auth** — phone + OTP login/registration, JWT access + refresh tokens, role-based authorization.
2. **Service-request lifecycle** — customer submits a request, a provider accepts it, both sides track status through to completion. Every write is now tied to the authenticated user, not a client-supplied ID.

## Run it

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs (interactive): http://127.0.0.1:8000/docs

## Auth flow

No passwords — phone + OTP only, matching the target users (first-time
smartphone users who may not want to remember a password).

| Method | Path                | Purpose                                                    |
|--------|---------------------|-------------------------------------------------------------|
| POST   | `/auth/otp/request` | Send an OTP to a phone number (rate-limited: 3 per 10 min)  |
| POST   | `/auth/otp/verify`  | Verify the OTP → creates the user on first login (role fixed then) → returns access + refresh tokens |
| POST   | `/auth/refresh`     | Exchange a valid refresh token for a new access + refresh pair |
| GET    | `/auth/me`          | Current user, from the `Authorization: Bearer <token>` header |

**Security choices, and why:**
- OTPs are never stored in plaintext — `code_hash` is an HMAC-SHA256 of
  `phone:code`, so a DB leak doesn't expose usable codes, and a code for
  one number can't be replayed against another.
- OTP checks use `hmac.compare_digest` (constant-time) to avoid timing
  attacks on the comparison.
- OTPs expire in 5 minutes and lock out after 5 wrong attempts.
- OTP *requests* are rate-limited (3 per phone per 10 minutes) so the
  endpoint can't be used to spam someone's phone or brute-force by
  requesting fresh codes. This limiter is in-memory — fine for one
  process; move it to Redis (`INCR`+`EXPIRE`) once you run multiple
  workers/instances, or the limit won't be shared across them.
- Access tokens are short-lived (30 min); refresh tokens last 30 days.
  `SECRET_KEY` **must** be overridden via env var in any real deployment
  — the default is a local-dev-only placeholder.
- In dev (`ENV` unset or not `"production"`), `/auth/otp/request` echoes
  the code back as `dev_otp` in the response so you can test without an
  SMS provider. This is automatically omitted once `ENV=production`.
  Wiring a real SMS provider (MSG91, Twilio, etc.) is the one thing
  still stubbed — see the `TODO` in `app/services/auth_service.py`.

**Example (curl):**
```bash
curl -X POST localhost:8000/auth/otp/request -d '{"phone":"+919876500001"}' -H "Content-Type: application/json"
# -> {"message":"OTP sent","expires_in_seconds":300,"dev_otp":"482913"}

curl -X POST localhost:8000/auth/otp/verify -H "Content-Type: application/json" \
  -d '{"phone":"+919876500001","code":"482913","role":"customer","name":"Kamta"}'
# -> {"access_token":"...","refresh_token":"...","user":{...}}
```

## Data model

**User** — `phone` (unique), `name`, `role` (`customer` | `provider`).

**ServiceRequest** — one customer-reported job.
- `status` moves through a strict state machine (`app/models.py:ALLOWED_TRANSITIONS`):

  ```
  request_sent → provider_reviewing → accepted → on_the_way → service_started → completed
                                    ↘ cancelled (from any non-terminal state) ↙
  ```
  Any jump that skips a step, or moves from a terminal state, is rejected
  with `409 Conflict` naming the allowed next steps.

**StatusEvent** — append-only audit trail; every status change is recorded
with a timestamp and optional note, so `GET /requests/{id}` returns the
full timeline for the tracking screen.

## Request endpoints (now auth-protected)

| Method | Path                    | Who                          | Purpose |
|--------|-------------------------|-------------------------------|---------|
| POST   | `/requests`              | customer only                 | Submit a new request (identity from token) |
| GET    | `/requests`               | any authenticated user        | List/filter by `customer_id`, `provider_id`, `status` |
| GET    | `/requests/{id}`           | any authenticated user        | Full detail + status timeline |
| POST   | `/requests/{id}/accept`    | provider only                 | Assigns them, → `accepted` |
| POST   | `/requests/{id}/reject`    | provider only                 | Declines → reopens (`request_sent`) for others |
| PATCH  | `/requests/{id}/status`     | role- and ownership-checked   | See below |

`PATCH .../status` enforces *who* can make each move, not just *whether*
the move is legal:
- `on_the_way`, `service_started`, `completed` — only the **assigned
  provider** for that request (`403` otherwise).
- `cancelled` — only the **owning customer** or the **assigned provider**
  (`403` otherwise).
- Any other transition — `409` with the allowed next steps.

Concurrency guard: if two providers try to accept the same request, the
second gets `409 Conflict`.

## Testing

```bash
python tests/test_request_flow.py
```

Spins up the real app on a local port and drives it over actual HTTP,
verifying: OTP request/verify, wrong-OTP rejection, `/auth/me`, unauthenticated
requests get `401`, role-gating on request creation and status updates,
the full lifecycle happy path, and the status timeline. All passing as of
this build.

## Production notes

- **Database**: local dev uses a SQLite file (zero config). For Turso, set
  `DATABASE_URL` to your Turso connection string and add
  `sqlalchemy-libsql` + `libsql-client` (commented in `requirements.txt`) —
  nothing else changes.
- **CORS**: `app/main.py` currently allows `*` for easy local testing. Lock
  this to your real frontend origin(s) before deploying.
- **SECRET_KEY**: set a real, long, random value via env var before
  deploying — never use the default.
- **SMS provider**: OTPs are only logged server-side / echoed in dev right
  now. Plug in MSG91/Twilio/etc. in `app/services/auth_service.py` before
  going live.
- **Rate limiter**: in-memory, per-process. Move to Redis before running
  more than one worker/instance.

## Deploying (Render + Turso)

### 1. Database — Turso, not a SQLite file

Render's free/starter disks are **ephemeral** — every redeploy wipes the
filesystem, so a plain `sqlite:///./service_hub.db` file loses all your
users and requests on the next deploy, and there's no backup at all.

Turso fixes both problems, and its free tier is enough for a while: 5 GB
storage, no credit card required, and — the important part —
**automatic backups with 24-hour point-in-time recovery built in**. If
someone (you, a bug, anything) wrecks the data, you can restore to any
moment in the last 24 hours without having built any backup system
yourself.

```bash
# once, locally (npm install -g turso-cli, or see turso.tech/docs for your OS):
turso auth login
turso db create service-hub
turso db show service-hub --url          # -> DATABASE_URL host
turso db tokens create service-hub       # -> auth token
```

`sqlalchemy-libsql` and `libsql-client` are already in `requirements.txt`
— **verified working** end-to-end against the app's full model set and
the whole auth+request test suite, not just assumed. Set on Render:
```
DATABASE_URL=sqlite+libsql://<your-db>-<org>.turso.io/?authToken=<token>
```
Nothing else changes — `app/database.py` is dialect-agnostic.

**If you ever need to actually restore** (data got corrupted, someone
fat-fingered a delete): Turso doesn't restore in place — you create a
new database from the old one at a past timestamp, then point
`DATABASE_URL` at the new one:
```bash
turso db create service-hub-restored --from-db service-hub --timestamp 2026-08-10T10:00:00Z
turso db show service-hub-restored --url
turso db tokens create service-hub-restored
```
Update `DATABASE_URL` on Render with the new URL/token, redeploy, then
delete the old database once you've confirmed the restored one is good.

### 2. Backend — Render

1. New Web Service → connect this repo (`service-hub-backend`).
2. Build command: `pip install -r requirements.txt`
3. Start command: uses the included `Procfile` automatically, or set
   explicitly: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Environment variables (Render dashboard → Environment):

   | Key | Value |
   |---|---|
   | `ENV` | `production` |
   | `SECRET_KEY` | a real random value — generate with `openssl rand -hex 32` |
   | `DATABASE_URL` | your Turso URL from step 1 |
   | `ALLOWED_ORIGINS` | your Vercel URL, e.g. `https://service-hub.vercel.app` |
   | `ADMIN_PHONES` | your own phone number(s), comma-separated — this is who can see `/admin/stats` |

   Without `SECRET_KEY` set, the app **refuses to start** in production
   (deliberately — see `app/security.py`). Without `ADMIN_PHONES` set,
   `/admin/stats` is closed to everyone, which is the safe default.

### 3. Frontend — Vercel

1. Import the `service-hub` repo into Vercel.
2. Environment variable: `NEXT_PUBLIC_API_URL` = your Render backend URL
   (e.g. `https://service-hub-backend.onrender.com`).
3. Deploy — Next.js needs no other config.

### 4. SMS — integration done, you just need an account

`app/sms.py` supports MSG91, Twilio, or a `console` no-op (default —
just logs the code, which is what powers `dev_otp` in local testing).
Switch providers with one env var, no code changes needed.

**MSG91 (recommended for India — cheaper, better delivery for Indian numbers):**
1. Sign up at msg91.com, get your auth key from the dashboard.
2. **DLT registration is mandatory in India** — you must register a
   transactional SMS template on the DLT platform (via MSG91's DLT flow
   or your telecom operator) before MSG91 will send anything to Indian
   numbers. Budget 1-3 business days for approval. Your template needs
   an OTP placeholder, e.g.:
   `"Your Service.Hub OTP is {{otp}}. Valid for 5 minutes. Do not share this code."`
3. Set on your backend:
   ```
   SMS_PROVIDER=msg91
   MSG91_AUTH_KEY=<from dashboard>
   MSG91_TEMPLATE_ID=<your approved DLT template id>
   MSG91_SENDER_ID=<your approved 6-char sender id>
   ```

**Twilio (better if you'll expand outside India later):**
1. Sign up at twilio.com, buy/verify a sending number.
2. Set:
   ```
   SMS_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=<from console>
   TWILIO_AUTH_TOKEN=<from console>
   TWILIO_FROM_NUMBER=<your Twilio number, e.g. +15551234567>
   ```

Either way: also `pip install requests` (already in `requirements.txt`).
The integration itself is tested (`tests/test_sms.py` — mocked HTTP
calls, verifies the exact request shape sent to each provider) so once
your credentials are set, it should just work. If a send fails, the
request still succeeds (the OTP row exists, "Resend code" will retry) —
it's logged server-side rather than surfaced to the user, so a flaky
provider doesn't look like a broken login page.

Set `ENV=production` once you go live — this automatically stops
echoing `dev_otp` in API responses, so codes only ever reach the real
phone.

### Checklist before calling it "live"

- [ ] `DATABASE_URL` points at Turso, not a local file
- [ ] `SECRET_KEY` is a real random value, not the default
- [ ] `ALLOWED_ORIGINS` is your real Vercel URL, not `*`
- [ ] `ADMIN_PHONES` is set to your own number(s)
- [ ] `ENV=production` is set (disables `dev_otp` in responses)
- [ ] `SMS_PROVIDER` + credentials set (see above) — code is done, you just need an MSG91/Twilio account and (for MSG91) DLT template approval
- [ ] `REDIS_URL` set if running more than one gunicorn worker — otherwise
      the OTP rate limit is effectively multiplied by your worker count
      (each worker counts independently). Render's own Redis add-on or
      Upstash's free tier both work; `pip install redis` once you add it.
      Without it, the app still runs fine — the limiter just silently
      falls back to per-worker counting and logs a warning at startup.

## Handling more load as you grow

What's already built for this (no extra work needed):
- DB indexes on every column requests are filtered/sorted by
  (`customer_id`, `provider_id`, `status`, `phone`)
- Every list endpoint is paginated (`limit`/`offset`, capped at 100 per
  page) — nothing returns an unbounded table scan
- `Procfile` runs multiple worker processes (`gunicorn` + `WEB_CONCURRENCY`,
  defaults to 4) so one slow request doesn't block everyone else
- Security headers, strict CORS, request-size limits on every input field

What you'll actually need to *do* as real traffic grows (this is normal —
no app is "infinitely scaled" out of the box, and the honest answer to
"handle high load" is these are operational steps you take when you see
real numbers, not something to over-build speculatively today):
1. **Redis for the rate limiter** (see checklist above) — do this before
   you add a second gunicorn worker or a second server instance.
2. **Turso read replicas** if read traffic (dashboard polling, request
   lookups) starts to dominate — Turso supports embedded replicas near
   your users.
3. **Bump `WEB_CONCURRENCY` and Render's instance size** — start here
   before anything fancier; FastAPI + gunicorn scales a long way
   vertically first.
4. **Move OTP "sending" to a background queue** (e.g. a simple job table,
   or Celery/RQ if it grows) once SMS volume is high enough that a slow
   provider API call shouldn't block the request thread.
5. **Watch `/health` with an uptime monitor** (UptimeRobot, Render's own
   health checks) so you find out about downtime before your users do.

None of this needs deciding today — the architecture doesn't block any of
it, they're additive steps you reach for when real usage numbers tell you
which one you actually need.
