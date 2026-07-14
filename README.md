# EcoLend

Secure peer-to-peer tool & equipment lending marketplace (MERN). Coursework
project for ST6005CEM — Secure Web Application Design, Implementation, and
Internal Penetration Testing.

## Structure

```
ecolend/
├── backend/    Express 4 + Mongoose 8 API (auth, listings, bookings, Khalti, admin)
├── frontend/   React 18 + Vite SPA
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Getting started

1. `cp .env.example .env` and fill in real values (never commit `.env`).
2. `docker-compose up` — brings up `frontend`, `backend`, and `mongo:7`.
3. Backend health check: `GET http://localhost:5000/api/health`.
