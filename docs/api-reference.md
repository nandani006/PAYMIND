# PAYMIND Enterprise — API Reference

> **Base URL:** `http://localhost:3001/api`  
> **Session Model:** JWT in HttpOnly Cookie (`paymind_token`) + Double-Submit CSRF Cookie (`paymind_csrf` / `X-CSRF-Token`)

---

## Global Authentication & CSRF Model

- **Session Authentication:** Authenticated requests automatically transmit the `paymind_token` HttpOnly cookie.
- **CSRF Token:** All mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) must include the `X-CSRF-Token` header.
- **Obtaining CSRF Token:** Call `GET /api/auth/csrf-token` on client initialization and after login.

---

## Endpoints Summary

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/auth/csrf-token` | Public | Obtain a fresh CSRF token and cookie |
| `POST` | `/api/auth/register` | Public | Register new enterprise organisation & initial admin user |
| `POST` | `/api/auth/login` | Public | Authenticate user, set HttpOnly cookie and issue CSRF |
| `POST` | `/api/auth/logout` | Authenticated | Revoke token (blocklist) and clear cookie |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current authenticated user profile & organisation |

### 2. Purchase Requests (`/api/requests`)
| Method | Endpoint | Minimum Role | Description |
|---|---|---|---|
| `GET` | `/api/requests` | `employee` | List requests (scoped to employee for non-managers, org-wide for managers+) |
| `GET` | `/api/requests/:id` | `employee` | Retrieve request details & approval history |
| `POST` | `/api/requests` | `employee` | Create purchase request (triggers policy check & Gemini AI scan) |
| `PATCH` | `/api/requests/:id/cancel` | `employee` | Cancel pending purchase request (owner only) |

### 3. Manager Approvals (`/api/approvals`)
| Method | Endpoint | Minimum Role | Description |
|---|---|---|---|
| `GET` | `/api/approvals/queue` | `manager` | List requests in `pending_approval` state for organisation |
| `POST` | `/api/approvals/:id/approve` | `manager` | Authorize request (self-approval blocked by separation of duties) |
| `POST` | `/api/approvals/:id/reject` | `manager` | Decline request with required comments |

### 4. Payments & PayPal Sandbox (`/api/payments`)
| Method | Endpoint | Minimum Role | Description |
|---|---|---|---|
| `POST` | `/api/payments/orders` | `finance_manager` | Initialize PayPal Orders v2 order for approved request |
| `POST` | `/api/payments/orders/:id/capture` | `finance_manager` | Execute server-side capture & zero-trust verification |
| `GET` | `/api/payments/orders/:id/status` | `finance_manager` | Get order payment status from transaction ledger |
| `GET` | `/api/payments/transactions` | `finance_manager` | List all settled & failed transactions |
| `POST` | `/api/payments/webhooks` | Public (Signed) | External PayPal Webhook listener with signature verification |

### 5. Budgets (`/api/budgets`)
| Method | Endpoint | Minimum Role | Description |
|---|---|---|---|
| `GET` | `/api/budgets` | `manager` | List department budgets and spent amounts |
| `GET` | `/api/budgets/:id/summary` | `manager` | Detailed budget utilisation and request breakdown |
| `POST` | `/api/budgets` | `finance_manager` | Create new departmental budget allocation |

### 6. Spending Policies (`/api/policies`)
| Method | Endpoint | Minimum Role | Description |
|---|---|---|---|
| `GET` | `/api/policies` | `employee` | List active spending policies for organisation |
| `GET` | `/api/policies/:id` | `employee` | Get specific policy configuration |
| `POST` | `/api/policies` | `finance_manager` | Create deterministic spending policy |
| `PUT` | `/api/policies/:id` | `finance_manager` | Update spending policy limits, categories, and blacklists |
| `DELETE` | `/api/policies/:id` | `finance_manager` | Delete spending policy |

### 7. Team & Directory (`/api/users`)
| Method | Endpoint | Minimum Role | Description |
|---|---|---|---|
| `GET` | `/api/users` | `manager` | List all active users within organisation |
| `GET` | `/api/users/:id` | `manager` | Retrieve user details |
| `POST` | `/api/users` | `org_admin` | Provision new team member and assign role |
| `PATCH` | `/api/users/:id` | `org_admin` | Update user details/role (privilege escalation protected) |
| `DELETE` | `/api/users/:id` | `org_admin` | Soft-deactivate user account |

### 8. Compliance Audit Trail (`/api/audit`)
| Method | Endpoint | Minimum Role | Description |
|---|---|---|---|
| `GET` | `/api/audit` | `manager` | Paginated immutable audit events log |
| `GET` | `/api/audit/entity/:type/:id` | `manager` | Audit history for specific record |

### 9. Dashboard Telemetry (`/api/dashboard`)
| Method | Endpoint | Minimum Role | Description |
|---|---|---|---|
| `GET` | `/api/dashboard/summary` | `employee` | High-level metrics (scoped to employee or org) |
| `GET` | `/api/dashboard/spend-trend` | `manager` | 6-month disbursement trends |
| `GET` | `/api/dashboard/top-vendors` | `manager` | Merchant volume leaderboard |
| `GET` | `/api/dashboard/category-breakdown` | `manager` | Spending distribution by procurement domain |

---

## Internal AI Service (`http://localhost:8000`)

| Method | Endpoint | Access | Header | Description |
|---|---|---|---|---|
| `GET` | `/health` | Public | None | Service liveness probe |
| `POST` | `/assess` | Internal Only | `X-Internal-Key` | Advisory procurement risk scan with Gemini 1.5 Flash |
