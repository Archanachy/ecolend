# EcoLend

Secure peer-to-peer tool & equipment lending marketplace (MERN). Coursework
project for ST6005CEM — Secure Web Application Design, Implementation, and
Internal Penetration Testing.

Neighbours list tools and equipment; others browse, request to borrow for a set
of dates, pay a rental fee plus a refundable deposit through Khalti, collect and
return the item, then review each other. Admins moderate users, bookings and
security alerts.

## Tech stack

- **Backend:** Node 20+, Express 4, Mongoose 8, MongoDB 7
- **Frontend:** React 18 + Vite, React Router 6
- **Auth/crypto:** argon2id password hashing, server-side sessions
  (`express-session` + `connect-mongo`), TOTP MFA (`otplib`) with argon2-hashed
  single-use backup codes, AES-256-GCM field encryption
- **Payments:** Khalti ePayment API v2 (server-side verified)
- **Tests:** `node --test` + `supertest` + `mongodb-memory-server`

## Security controls

- argon2id hashing; generic auth errors + constant-time login (no user
  enumeration); account status/lockout revealed only after a correct password
- Account lockout (5 fails → 15 min) and IP blocking (20 fails → 1 hr); CAPTCHA
  after repeated failures; password-expiry policy
- Server-side sessions, `SameSite=Strict`, session regeneration on privilege
  change, device binding (UA+IP), and session revocation on password reset
- Self-implemented double-submit CSRF protection
- TOTP MFA + single-use backup codes
- AES-256-GCM encryption of sensitive fields (MFA secret, phone, address)
- RBAC (role read from the session only); ownership/IDOR checks on every resource
- Khalti payments verified server-side (status **and** amount), idempotent,
  fail-closed, with pidx-reuse prevention
- SHA-256 transaction-integrity hashing on bookings (tamper detection)
- Security headers via Helmet; input validation with Zod; structured logging

## Structure

```
ecolend/
├── backend/            Express + Mongoose API
│   ├── src/            controllers, models, routes, services, middleware
│   ├── tests/          node:test suites (auth, mfa, payments, bookings, admin…)
│   └── scripts/        one-off maintenance scripts
├── frontend/           React + Vite SPA
├── docker-compose.yml  frontend + backend + mongo:7
├── .github/workflows/  CI (lint, tests, npm audit, Semgrep, docker build)
└── .env.example        required environment variables
```

## Getting started

### Option A — Docker (self-contained)

Brings up the frontend, backend and a bundled MongoDB 7 with no external
dependencies.

1. `cp .env.example .env` and fill in the values (see below). The compose file
   overrides `MONGODB_URI` to point at the bundled `mongo` container, so you can
   leave that value as-is for Docker.
2. `docker compose up --build`
3. Frontend: <http://localhost:5173> · Backend health: `GET http://localhost:5000/api/health`

### Option B — Local dev (npm)

Run each package directly; uses whatever `MONGODB_URI` is in `backend/.env`
(e.g. a MongoDB Atlas cluster).

```bash
# backend
cd backend && npm install && npm run dev     # http://localhost:5000

# frontend (separate terminal)
cd frontend && npm install && npm run dev     # http://localhost:5173
```

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `SESSION_SECRET` | Session signing secret |
| `FIELD_ENC_KEY` | **64 hex chars (256-bit)** — required for field encryption / MFA |
| `APP_URL`, `BACKEND_URL` | Frontend / backend base URLs |
| `KHALTI_SECRET_KEY` | Khalti live/test secret key |
| `MAIL_HOST/PORT/USER/PASS/FROM` | SMTP for verification & reset email (blank = dev console transport) |
| `CAPTCHA_SECRET_KEY` | hCaptcha secret (dev-bypassed when blank) |

Generate a field-encryption key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Testing & quality

```bash
cd backend  && npm test && npm run lint       # node:test suites + ESLint
cd frontend && npm run lint && npm run build   # ESLint + production build
```

CI (`.github/workflows/ci.yml`) runs lint, the test suite, `npm audit`, a
Semgrep OWASP-Top-Ten scan, a `dangerouslySetInnerHTML` grep, and a Docker
build on every push.

## Maintenance scripts

There is **no default admin account** — admin is granted deliberately:

```bash
cd backend
node scripts/make-admin.js <email>            # promote a user to admin
node scripts/make-admin.js <email> --demote    # revert to a normal user
node scripts/reseal-bookings.js [--apply]      # re-seal booking integrity hashes
```
