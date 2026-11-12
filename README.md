# PAYMIND Enterprise

> **Autonomous AI-Powered B2B Procurement & Spending Intelligence Platform**  
> Built for the PayPal AI Hackathon

PAYMIND Enterprise transforms corporate procurement into an autonomous, secure, and policy-governed workflow. It combines **deterministic financial policy enforcement** with **Gemini 1.5 Flash contextual intelligence** and **PayPal Sandbox Orders v2 verified server capture**.

---

## Architecture Overview

```
┌─────────────────────────────────┐
│     React 18 + Vite Frontend    │  Linear / Ramp / Stripe-grade FinTech UI
│     (Port 5173)                 │  Role-Specific Dashboards (Employee, Manager, Finance, Admin)
└────────────────┬────────────────┘
                 │ HTTP (REST + HttpOnly Cookies + CSRF)
                 ▼
┌─────────────────────────────────┐       Internal API Key (Fail-Closed)       ┌───────────────────────────────┐
│     Node.js + Express Backend   │ ─────────────────────────────────────────► │     Python FastAPI AI Engine  │
│     (Port 3001)                 │                                            │     (Port 8000)               │
└────────┬────────────────────────┘                                            └───────────────┬───────────────┘
         │                                                                                     │
         ├──────────────────────────────┐                                                      │ Prompt Engineering
         │ Neon PostgreSQL Pool         │ PayPal Orders v2 (REST)                              ▼
         ▼                              ▼                                           ┌──────────────────────┐
┌─────────────────┐            ┌───────────────────────────────┐                    │   Google Gemini 1.5  │
│ Neon PostgreSQL │            │ PayPal Sandbox US Merchant    │                    │   Flash Model API    │
│ (Remote/neondb) │            │ (BKFTCMLW6CRKQ / Orders v2)   │                    └──────────────────────┘
└─────────────────┘            └───────────────────────────────┘
```

---

## Core Capabilities

1. **Role-Based Experience Architecture:**
   - **Employee:** Personal procurement tracker, guided request submission, instant policy feedback, request cancellation.
   - **Manager:** Departmental approval queue, inline authorization with self-approval separation of duties, team budget health.
   - **Finance Manager:** Executive financial control suite, settled spend metrics, top vendors, and one-click verified PayPal Sandbox disbursement.
   - **Organisation Admin:** Enterprise directory management, deterministic policy limit configuration, and SOC2/SOX append-only audit trail.
2. **Deterministic Governance First:** Hard policy limits (single-purchase caps, monthly budget ceilings, category whitelists, vendor blacklists) are enforced on the server before AI invocation.
3. **Gemini 1.5 Flash Advisory Intelligence:** Evaluates anomalous pricing, role alignment, and duplicate spending patterns.
4. **PayPal Orders v2 Server-Side Verification:** Zero-trust capture logic verifies settled amount and currency strictly against the database row lock.
5. **Immutable Compliance Audit Ledger:** Every status change, policy rejection, user provision, and disbursement records actor identity, IP, entity reference, and full JSON payload state.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, Tailwind CSS, Recharts, Lucide React, Vitest |
| **Backend** | Node.js (v18+), Express.js, Joi, Helmet, CSRF-CSRF, Jest, Supertest |
| **AI Service** | Python 3.11+, FastAPI, Google Generative AI (Gemini 1.5 Flash), Pytest |
| **Database** | Neon PostgreSQL (`neondb`) with connection pooling and `pgcrypto` |
| **Disbursements** | PayPal Orders v2 REST API (PayPal Sandbox US Business Merchant) |
| **Security** | JWT in HttpOnly cookies, Double-Submit CSRF, bcrypt (12 rounds), fail-closed internal auth |

---

## Quick Start

### 1. Prerequisites
- **Node.js:** v18+ (tested on Node v20/v22)
- **Python:** 3.11+
- **PostgreSQL / Neon:** PostgreSQL 15+ database URL
- **PayPal Developer Account:** Sandbox REST application credentials
- **Google AI Studio Key:** Gemini API key

### 2. Environment Configuration

Copy the template `.env.example` files to `.env` in each service folder:

```bash
# Root reference
cp .env.example .env

# Backend
cp backend/.env.example backend/.env

# AI Service
cp ai-service/.env.example ai-service/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Ensure `backend/.env` and `ai-service/.env` share the same `AI_SERVICE_API_KEY` / `BACKEND_API_KEY` for internal authentication.

### 3. Database Migration & Seed Data

```bash
cd backend
npm install
npm run migrate
npm run seed
```

#### Demo Accounts (Password: `Demo1234!`):
| Email | Assigned Role | Department | Description |
| :--- | :--- | :--- | :--- |
| `admin@democorp.com` | `org_admin` | Administration | Full platform governance, policies, directory |
| `finance@democorp.com` | `finance_manager` | Finance | Executive liquidity, PayPal disbursement payer |
| `manager@democorp.com` | `manager` | Engineering | Team procurement approver, budget monitor |
| `employee@democorp.com` | `employee` | Engineering | Purchase requester |
| `design@democorp.com` | `employee` | Design | Design team requester |

### 4. Running the Platform

Run each service in a dedicated terminal:

```bash
# Terminal 1 — AI Service (FastAPI)
cd ai-service
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2 — Backend API (Node.js)
cd backend
npm start

# Terminal 3 — Frontend (Vite)
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Security & Defense-in-Depth

- **Fail-Closed AI Authentication:** Requests to `POST /assess` require a valid `X-Internal-Key` header matching `BACKEND_API_KEY`. If unconfigured, the service fails closed with HTTP 503.
- **Zero-Trust Client Amounts:** The backend completely ignores client-supplied amounts during payment creation and capture. Amounts are read directly from locked database rows in Neon PostgreSQL.
- **Double-Submit CSRF Protection:** Mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) require a valid `X-CSRF-Token` header.
- **Privilege Escalation Guards:** Users cannot modify their own roles or escalate to `super_admin`.
- **Sanitized Error Responses:** Database constraint violations and stack traces are suppressed in production mode to prevent information leakage.
- **Cryptographic Webhook Signature Verification:** External PayPal webhooks at `POST /api/payments/webhooks` verify signatures using PayPal's `/v1/notifications/verify-webhook-signature` API.

---

## Automated Test Suites

```bash
# 1. Backend Unit & Security Tests (Jest)
cd backend
npm test

# 2. Frontend Unit & Component Tests (Vitest)
cd frontend
npm run test

# 3. AI Service Tests (Pytest)
cd ai-service
python -m pytest tests/ -v
```

---

## Documentation Links

- [API Reference](docs/api-reference.md)
- [Database Schema & Migrations](docs/database-schema.md)
- [PayPal Sandbox Integration](docs/paypal-integration.md)
- [Production Deployment Guide](docs/deployment.md)

---

## License

MIT License — see [LICENSE](LICENSE) for details.
