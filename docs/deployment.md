# PAYMIND Deployment Guide

> [!NOTE]
> PAYMIND is a three-service distributed enterprise application:
> - **Frontend**: React 18 / Vite / Tailwind CSS / Radix UI (default port 5173)
> - **Backend**: Node.js 20 / Express / Neon PostgreSQL / PayPal REST SDK (default port 3001)
> - **AI Service**: Python 3.11+ / FastAPI / Google Gemini 1.5 Flash (default port 8000)
>
> All three services communicate securely via internal authentication, signed tokens, and encrypted transport.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Structure](#2-repository-structure)
3. [PostgreSQL & Neon Database Setup](#3-postgresql--neon-database-setup)
4. [Environment Variable Reference](#4-environment-variable-reference)
5. [Running Database Migrations and Seeds](#5-running-database-migrations-and-seeds)
6. [Development Startup](#6-development-startup)
7. [Running Automated Test Suites](#7-running-automated-test-suites)
8. [Production Deployment Considerations](#8-production-deployment-considerations)
9. [Environment Variable Matrix](#9-environment-variable-matrix)

---

## 1. Prerequisites

| Tool | Minimum Version | Notes |
|---|---|---|
| Node.js | 20 LTS | Required for backend and frontend build |
| npm | 10+ | Bundled with Node.js 20 |
| Python | 3.11+ | Required for FastAPI AI service |
| pip | 23+ | Python package manager |
| PostgreSQL | 15+ or Neon | Serverless PostgreSQL with pgvector support |
| Git | 2.40+ | Version control |

---

## 2. Repository Structure

```
PAYMIND/
├── frontend/          # React 18 + Vite SPA with Tailwind CSS & Radix UI
├── backend/           # Express API with PostgreSQL pool & PayPal Orders v2
│   ├── src/           # Routes, middleware, services, controllers
│   ├── migrations/    # Schema definitions (PostgreSQL DDL)
│   ├── seeds/         # Initial organization, user roles, policies, budgets
│   └── tests/         # Jest automated test suites
├── ai-service/        # FastAPI procurement assessment microservice
│   ├── app/           # Routers, schemas, Gemini client
│   └── tests/         # Pytest test suites
└── docs/              # Comprehensive architecture, API, and PayPal guides
```

---

## 3. PostgreSQL & Neon Database Setup

PAYMIND supports both managed cloud databases (such as **Neon Serverless PostgreSQL**) and local Docker instances.

### Option A — Neon PostgreSQL (Recommended)
1. Sign up at [neon.tech](https://neon.tech) and create a project.
2. Obtain the pooled connection string:
   ```env
   DATABASE_URL=postgresql://<user>:<password>@<endpoint>-pooler.region.neon.tech/neondb?sslmode=require
   ```
3. Set this variable in `backend/.env`.

### Option B — Local Docker Container
```bash
docker run -d \
  --name paymind-postgres \
  -e POSTGRES_USER=paymind \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=paymind_dev \
  -p 5432:5432 \
  postgres:15-alpine
```

---

## 4. Environment Variable Reference

### 4.1 Backend (`backend/.env`)

| Variable | Description | Requirement |
|---|---|---|
| `PORT` | API server port (default `3001`) | Optional |
| `NODE_ENV` | Runtime environment (`development` or `production`) | Required |
| `DATABASE_URL` | PostgreSQL connection string (supports SSL) | **Required** |
| `JWT_SECRET` | Secret key for signing user authentication tokens (min 32 chars) | **Required** |
| `CSRF_SECRET` | Secret key for generating and validating double-submit CSRF tokens (min 32 chars) | **Required** |
| `FRONTEND_URL` | Allowed CORS origin (e.g. `http://localhost:5173`) | **Required** |
| `AI_SERVICE_URL` | Microservice URL (e.g. `http://localhost:8000`) | **Required** |
| `AI_SERVICE_API_KEY` | Shared internal key sent in `X-Internal-Key` header | **Required** |
| `PAYPAL_API_URL` | Base URL (`https://api-m.sandbox.paypal.com` or live) | **Required** |
| `PAYPAL_CLIENT_ID` | PayPal REST App Client ID | **Required** |
| `PAYPAL_CLIENT_SECRET` | PayPal REST App Client Secret | **Required** |
| `PAYPAL_WEBHOOK_ID` | Registered Webhook ID for signature verification | Recommended |

### 4.2 Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL for backend API requests (e.g. `http://localhost:3001/api`) |
| `VITE_PAYPAL_CLIENT_ID` | Public PayPal Client ID passed to PayPal JavaScript SDK |

> [!CAUTION]
> Never place `PAYPAL_CLIENT_SECRET`, `JWT_SECRET`, or `CSRF_SECRET` in `frontend/.env`.

### 4.3 AI Service (`ai-service/.env`)

| Variable | Description |
|---|---|
| `HOST` | Microservice bind host (`127.0.0.1` or `0.0.0.0`) |
| `PORT` | Microservice port (default `8000`) |
| `GEMINI_API_KEY` | Google Gemini API Key from Google AI Studio |
| `GEMINI_MODEL` | Target Gemini model (e.g. `gemini-1.5-flash`) |
| `BACKEND_API_KEY` | Shared secret (must match `AI_SERVICE_API_KEY` in `backend/.env`) |
| `LLM_TIMEOUT_SECONDS` | Timeout for AI inference (default `15`) |

---

## 5. Running Database Migrations and Seeds

From `backend/`:

```bash
cd backend
npm install

# Run all migrations
npm run migrate:up

# Seed reference data (Organizations, Demo Users, Policies, Budgets)
npm run seed
```

### Pre-configured Demo Accounts
- **Super Admin**: `admin@acme.com` / `Password123!`
- **Finance Manager**: `manager@acme.com` / `Password123!`
- **Employee**: `employee@acme.com` / `Password123!`

---

## 6. Development Startup

### Terminal 1 — AI Service
```bash
cd ai-service
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Terminal 2 — Backend API
```bash
cd backend
npm install
node server.js
```

### Terminal 3 — Frontend Web Application
```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## 7. Running Automated Test Suites

PAYMIND includes automated test suites across all three service layers:

### 1. Backend Automated Tests (Jest)
Runs route validation, RBAC security, privilege escalation protection, and PayPal signature verification tests:
```bash
cd backend
npm test -- --testPathPattern=tests
```

### 2. Frontend Automated Tests (Vitest)
Runs UI component and utility formatter tests:
```bash
cd frontend
npm run test
```

### 3. AI Service Automated Tests (Pytest)
Runs fail-closed security authentication and procurement risk assessment tests:
```bash
cd ai-service
pytest tests/ -v
```

### 4. Frontend Production Build Verification
Verifies zero TypeScript or JSX bundling errors:
```bash
cd frontend
npm run build
```

---

## 8. Production Deployment Considerations

1. **Reverse Proxy & TLS**: Run frontend, backend, and AI service behind an HTTPS reverse proxy (e.g. NGINX, Cloudflare, or AWS ALB).
2. **Cookie Security**: Ensure `NODE_ENV=production` is set so auth cookies enforce `Secure: true`, `SameSite: strict`, and `HttpOnly: true`.
3. **Internal Key Confidentiality**: Generate high-entropy strings (min 64 chars) for `JWT_SECRET`, `CSRF_SECRET`, and `AI_SERVICE_API_KEY`.
4. **CORS Configuration**: Restrict `FRONTEND_URL` in `backend/.env` strictly to your production domain.
5. **PayPal Live Switch**:
   - Change `PAYPAL_API_URL` to `https://api-m.paypal.com`.
   - Update `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` with live production credentials.
   - Register the production webhook URL `https://api.yourdomain.com/api/payments/webhooks` in the PayPal Developer Dashboard and set `PAYPAL_WEBHOOK_ID`.

---

## 9. Environment Variable Matrix

| Variable | Backend | Frontend | AI Service | Secret? |
|---|---|---|---|---|
| `DATABASE_URL` | ✅ | ❌ | ❌ | Yes |
| `JWT_SECRET` | ✅ | ❌ | ❌ | Yes |
| `CSRF_SECRET` | ✅ | ❌ | ❌ | Yes |
| `AI_SERVICE_API_KEY` | ✅ | ❌ | ❌ | Yes |
| `BACKEND_API_KEY` | ❌ | ❌ | ✅ | Yes |
| `PAYPAL_CLIENT_SECRET` | ✅ | ❌ | ❌ | Yes |
| `PAYPAL_CLIENT_ID` | ✅ | ❌ | ❌ | Public |
| `VITE_PAYPAL_CLIENT_ID`| ❌ | ✅ | ❌ | Public |
| `GEMINI_API_KEY` | ❌ | ❌ | ✅ | Yes |
| `FRONTEND_URL` | ✅ | ❌ | ❌ | No |
| `VITE_API_URL` | ❌ | ✅ | ❌ | No |
| `AI_SERVICE_URL` | ✅ | ❌ | ❌ | No |
