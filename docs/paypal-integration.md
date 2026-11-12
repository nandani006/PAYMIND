# PayPal Integration Guide

> [!IMPORTANT]
> PAYMIND uses the **PayPal Orders v2 REST API** with zero-trust server-side validation. The integration is split into two stages: **order creation** (initiating) and **order capture** (settling). Payment is only settled after explicit human approval — the system never auto-captures.

---

## Table of Contents

1. [Sandbox Setup & Merchant Configuration](#1-sandbox-setup--merchant-configuration)
2. [Credentials and Environment Variables](#2-credentials-and-environment-variables)
3. [OAuth 2.0 Token Exchange](#3-oauth-20-token-exchange)
4. [Order Creation Flow](#4-order-creation-flow)
5. [Order Capture Flow](#5-order-capture-flow)
6. [Zero-Trust Security & Idempotency](#6-zero-trust-security--idempotency)
7. [Webhook Signature Verification](#7-webhook-signature-verification)
8. [Error Handling Reference](#8-error-handling-reference)
9. [Testing with Sandbox Accounts](#9-testing-with-sandbox-accounts)
10. [Production Checklist](#10-production-checklist)

---

## 1. Sandbox Setup & Merchant Configuration

### 1.1 Merchant Configuration
PAYMIND Enterprise uses a dedicated US Business Sandbox merchant account to avoid regional cross-border payment restrictions and currency mismatch issues:

- **App Name**: `PAYMIND Enterprise US`
- **Merchant Account Country**: United States (`US`)
- **Primary Currency**: `USD`
- **Platform Capability**: Full REST API Orders v2 support (`CAPTURE` intent)

### 1.2 Developer Dashboard Provisioning
1. Sign in to [developer.paypal.com](https://developer.paypal.com).
2. Go to **Dashboard → Apps & Credentials → Sandbox**.
3. Create or select your REST App (`PAYMIND Enterprise US`) associated with the US Business merchant.
4. Copy the **Client ID** and **Client Secret**.
5. In **Dashboard → Testing → Sandbox Accounts**, verify:
   - **Business Account (Seller)**: Primary currency USD, US country.
   - **Personal Account (Buyer)**: US country, funded with sandbox USD balance.

---

## 2. Credentials and Environment Variables

Add the following to `backend/.env`:

```env
# PayPal Configuration
PAYPAL_CLIENT_ID=<your-sandbox-client-id>
PAYPAL_CLIENT_SECRET=<your-sandbox-client-secret>
PAYPAL_API_URL=https://api-m.sandbox.paypal.com
PAYPAL_WEBHOOK_ID=<your-registered-webhook-id>
FRONTEND_URL=http://localhost:5173
```

Add the public client ID to `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
VITE_PAYPAL_CLIENT_ID=<your-sandbox-client-id>
```

> [!NOTE]
> Client secrets are strictly confined to `backend/.env` and must never be exposed to the frontend bundle or client network traffic.

---

## 3. OAuth 2.0 Token Exchange

The backend exchanges `PAYPAL_CLIENT_ID:PAYPAL_CLIENT_SECRET` for an OAuth2 bearer token:

### Token Request
```http
POST https://api-m.sandbox.paypal.com/v1/oauth2/token
Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

### Response
```json
{
  "scope": "https://api-m.paypal.com/v1/payments/...",
  "access_token": "A21AA...",
  "token_type": "Bearer",
  "app_id": "APP-...",
  "expires_in": 32400
}
```

---

## 4. Order Creation Flow

Triggered when the authorized employee or admin clicks **Pay with PayPal** on an approved procurement request.

### Endpoint: `POST /api/payments/create-order`
- **Headers**: `Cookie: token=...`, `X-CSRF-Token: ...`, `Content-Type: application/json`
- **Request Body**:
  ```json
  { "requestId": "3f8e5898-1111-4444-8888-222233334444" }
  ```

### Zero-Trust Verification (Server-Side)
1. The backend ignores any amount sent by the client.
2. It fetches the purchase request directly from Neon PostgreSQL:
   ```sql
   SELECT * FROM purchase_requests WHERE id = $1 AND organisation_id = $2;
   ```
3. Checks eligibility: `request.status === 'approved'`.
4. Checks existing pending transactions: ensures no uncompleted transaction already exists.
5. Uses the verified database amount and currency (`USD`).

### Orders v2 REST API Request Payload
```json
{
  "intent": "CAPTURE",
  "purchase_units": [
    {
      "reference_id": "3f8e5898-1111-4444-8888-222233334444",
      "description": "PAYMIND Purchase: Software Subscription",
      "amount": {
        "currency_code": "USD",
        "value": "350.00"
      },
      "custom_id": "3f8e5898-1111-4444-8888-222233334444"
    }
  ],
  "payment_source": {
    "paypal": {
      "experience_context": {
        "brand_name": "PAYMIND",
        "locale": "en-US",
        "landing_page": "LOGIN",
        "shipping_preference": "NO_SHIPPING",
        "user_action": "PAY_NOW",
        "return_url": "http://localhost:5173/requests?payment=success",
        "cancel_url": "http://localhost:5173/requests?payment=cancelled"
      }
    }
  }
}
```

---

## 5. Order Capture Flow

Triggered when the buyer approves the order via the PayPal SDK popup / modal.

### Endpoint: `POST /api/payments/capture-order`
- **Headers**: `Cookie: token=...`, `X-CSRF-Token: ...`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "orderId": "5O190127TN364715T",
    "requestId": "3f8e5898-1111-4444-8888-222233334444"
  }
  ```

### Server-Side Capture Execution
1. Resolves OAuth token.
2. Calls PayPal capture API:
   ```http
   POST https://api-m.sandbox.paypal.com/v2/checkout/orders/5O190127TN364715T/capture
   Authorization: Bearer <access_token>
   PayPal-Request-Id: <idempotency_uuid>
   Content-Type: application/json
   ```
3. Verifies capture response: `status === 'COMPLETED'`.
4. Updates database in a single atomic transaction:
   - Updates `transactions` record with `paypal_capture_id`, `status = 'COMPLETED'`, and PayPal JSON metadata.
   - Updates `purchase_requests` status: `status = 'paid'`.
   - Records audit log entry `payment.captured`.

---

## 6. Zero-Trust Security & Idempotency

- **Zero-Trust Amounts**: The backend never accepts payment amounts or currencies from client requests. All values are sourced exclusively from authenticated database records.
- **Idempotency Protection**: Every order creation and capture generates a cryptographically random UUID (`PayPal-Request-Id`). Captures check existing transaction status to prevent duplicate charges if retried.
- **CSRF & Cookie Protection**: All payment endpoints require `X-CSRF-Token` validation along with secure `HttpOnly` JWT cookie authentication.

---

## 7. Webhook Signature Verification

### Endpoint: `POST /api/payments/webhooks`
External asynchronous events sent by PayPal are validated before any processing.

### Signature Verification Process
PayPal provides signature verification via the `/v1/notifications/verify-webhook-signature` endpoint:

```http
POST https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "auth_algo": "<PAYPAL-AUTH-ALGO header>",
  "cert_url": "<PAYPAL-CERT-URL header>",
  "transmission_id": "<PAYPAL-TRANSMISSION-ID header>",
  "transmission_sig": "<PAYPAL-TRANSMISSION-SIG header>",
  "transmission_time": "<PAYPAL-TRANSMISSION-TIME header>",
  "webhook_id": "<PAYPAL_WEBHOOK_ID env var>",
  "webhook_event": <parsed raw event body>
}
```

If `verification_status !== 'SUCCESS'`, the backend immediately rejects the request with `400 Bad Request`.

### Supported Webhook Events
- `PAYMENT.CAPTURE.COMPLETED`: Ensures request status is marked `paid` and transaction is `COMPLETED` even if buyer closes browser before capture callback.
- `CHECKOUT.ORDER.APPROVED`: Logs buyer approval.
- `PAYMENT.CAPTURE.DENIED`: Marks transaction as `FAILED`.

---

## 8. Error Handling Reference

| PayPal Error Code | HTTP Status | Meaning | Backend Action |
|---|---|---|---|
| `INSTRUMENT_DECLINED` | 422 | Buyer's payment method declined | Return 422 to frontend; allow retry |
| `ORDER_ALREADY_CAPTURED` | 422 | Capture attempted twice | Return existing capture record (idempotent) |
| `INVALID_RESOURCE_ID` | 404 | Order ID not found | Log error; reject capture |
| `NOT_AUTHORIZED` | 401 | Invalid client credentials | Re-authenticate OAuth2; alert operations |
| `UNPROCESSABLE_ENTITY` | 422 | Business rule or currency violation | Return error detail safely to client |

---

## 9. PayPal Sandbox Testing: End-to-End vs Mocked Suites

PAYMIND strictly separates **automated integration tests** (using mocked PayPal API schemas) from **end-to-end live Sandbox testing** (requiring interactive browser authentication).

### 9.1 Automated Integration & Unit Tests (Mocked)
Automated tests run in continuous integration without requiring live PayPal Sandbox credentials or internet access:
- **Test file**: [`backend/tests/paypal_verification.test.js`](file:///d:/DESKTOP%20DATA/Desktop/PAYMIND/backend/tests/paypal_verification.test.js)
- **Coverage**:
  - Currency-aware minor unit monetary equality (`toMinorUnits`, `compareMonetaryAmounts`).
  - Strict capture verification (tampered amount rejection, currency mismatch rejection, missing capture ID rejection, pending status rejection).
  - Idempotent capture response validation (returns 200 with captured details on duplicate captures).
  - Webhook cryptographic signature payload formatting.
- **Run command**:
  ```bash
  cd backend
  npm test -- --testPathPattern=paypal_verification
  ```

---

### 9.2 End-to-End Live Sandbox Testing Procedure

Follow these step-by-step instructions to test genuine payment approval and settlement with PayPal Sandbox:

#### Step 1: Prerequisites
1. **US Business Sandbox Merchant Account**:
   - Ensure `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` in `backend/.env` belong to the **PAYMIND Enterprise US** REST application (Country: US, Primary currency: USD).
   - Ensure `VITE_PAYPAL_CLIENT_ID` in `frontend/.env` matches this client ID.
2. **US Personal Sandbox Buyer Account**:
   - In [developer.paypal.com/dashboard/accounts](https://developer.paypal.com/dashboard/accounts), locate or create a US Personal sandbox buyer account.
   - Note the sandbox email (e.g. `buyer-us@personal.example.com`) and system-generated password.
   - Verify the buyer account has a USD balance (e.g. $5,000.00 USD).

#### Step 2: Service Startup
Open three terminals and start the services:
```bash
# Terminal 1: AI Service
cd ai-service
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Terminal 2: Backend API
cd backend
node server.js

# Terminal 3: Frontend Web Application
cd frontend
npm run dev
```

#### Step 3: Procurement Request & Approval Workflow
1. Navigate to `http://localhost:5173/login`.
2. Log in as Employee (`employee@acme.com` / `Password123!`).
3. Click **New Purchase Request**:
   - **Title**: `Datadog APM Enterprise Subscription`
   - **Vendor**: `Datadog, Inc.`
   - **Amount**: `350.00`
   - **Currency**: `USD`
   - **Category**: `Software & Cloud Services`
4. Click **Submit Request**. The Gemini AI microservice analyzes the request and produces a risk assessment badge.
5. Log out and log in as Finance Manager (`manager@acme.com` / `Password123!`).
6. Navigate to **Requests**, open the submitted Datadog request, and click **Approve**.

#### Step 4: Interactive Buyer Approval in PayPal Sandbox Modal
1. As the Finance Manager or authorized requester, click **Pay with PayPal**.
2. The PayPal SDK creates a backend order via `POST /api/payments/orders` with `landing_page: 'LOGIN'`, `intent: 'CAPTURE'`, and amount `$350.00 USD`.
3. The PayPal pop-up modal opens securely:
   - Enter your US Sandbox Personal buyer email.
   - Enter your Sandbox buyer password and click **Log In**.
   - Review the order: **PAYMIND Enterprise**, Total `$350.00 USD`, payment method.
   - Click **Complete Purchase** (or **Pay Now**).

#### Step 5: Capture & Atomic Settlement Verification
1. Upon buyer approval, PayPal returns the order ID to the frontend `onApprove` callback.
2. The frontend triggers `POST /api/payments/orders/:orderId/capture`.
3. The backend executes zero-trust checks:
   - Validates that the capture status is `COMPLETED`.
   - Validates that the capture ID is valid.
   - Converts both the database amount and the PayPal captured amount into integer minor units (cents: `35000`) to guarantee exact monetary agreement.
4. The database updates atomically:
   - `purchase_requests.status` transitions from `payment_initiated` to `completed`.
   - `transactions.status` transitions to `completed` with `paypal_capture_id` and settlement timestamp.
   - An immutable audit trail entry (`capture_payment`) is logged.
5. The frontend UI immediately updates: the request badge turns emerald (`completed`), displaying the capture ID and receipt.

---

## 10. Production Checklist

- [ ] Switch `PAYPAL_API_URL` to `https://api-m.paypal.com`.
- [ ] Replace sandbox `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` with live production credentials.
- [ ] Register the production webhook URL `https://your-domain.com/api/payments/webhooks` in PayPal Developer Portal.
- [ ] Set `PAYPAL_WEBHOOK_ID` in `backend/.env`.
- [ ] Ensure `FRONTEND_URL` matches the production domain.
- [ ] Conduct live $1 verification transaction and confirm end-to-end capture and audit trail.
