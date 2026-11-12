# PAYMIND Database Schema Reference

> [!NOTE]
> PAYMIND uses **PostgreSQL 15+**. All tables live in the default `public` schema unless stated.
> UUID primary keys are generated with `gen_random_uuid()` (pgcrypto). Timestamps are `TIMESTAMPTZ` stored in UTC.

---

## Entity-Relationship Overview

```
organisations ──< users ──< purchase_requests ──< ai_assessments
                   │                │
                   │                └──< approvals
                   │                └──< transactions ──< budget_ledger
                   │
                   └──< policies
                   └──< budgets ──< budget_ledger
                   └── token_blocklist
                   └──< audit_logs
```

---

## Table 1: `organisations`

Stores tenant/company records. All other resources are scoped to an organisation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK, default `gen_random_uuid()` | Organisation identifier |
| `name` | `VARCHAR(255)` | NOT NULL | Display name of the organisation |
| `slug` | `VARCHAR(100)` | NOT NULL, UNIQUE | URL-safe identifier (e.g. `acme-corp`) |
| `is_active` | `BOOLEAN` | NOT NULL, default `true` | Soft-disable an org without deleting data |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | Last modification timestamp |

**Indexes:** `UNIQUE(slug)`

---

## Table 2: `users`

Application users. Each user belongs to exactly one organisation.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | User identifier |
| `org_id` | `UUID` | NOT NULL, FK → `organisations.id` ON DELETE CASCADE | Owning organisation |
| `name` | `VARCHAR(255)` | NOT NULL | Full display name |
| `email` | `VARCHAR(320)` | NOT NULL | Email address (unique within org) |
| `password_hash` | `VARCHAR(255)` | NOT NULL | Argon2id hash of the password |
| `role` | `VARCHAR(20)` | NOT NULL, CHECK IN (`employee`, `manager`, `admin`) | RBAC role |
| `is_active` | `BOOLEAN` | NOT NULL, default `true` | Soft-delete flag |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | — |

**Indexes:**
- `UNIQUE(email)` — global uniqueness across all orgs
- `INDEX(org_id)` — tenant isolation queries
- `INDEX(org_id, role)` — role-filtered listing

---

## Table 3: `token_blocklist`

Stores invalidated JWT identifiers (JTI) to support immediate logout.
Entries are pruned by a nightly cron once past their expiry.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | Auto-incrementing row ID |
| `jti` | `VARCHAR(36)` | NOT NULL, UNIQUE | JWT ID claim (`uuid v4`) |
| `user_id` | `UUID` | NOT NULL, FK → `users.id` ON DELETE CASCADE | Owner of the token |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | When the original token would have expired |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | When logout occurred |

**Indexes:** `UNIQUE(jti)`, `INDEX(expires_at)` (for pruning queries)

---

## Table 4: `policies`

One active procurement policy per organisation (upsert pattern).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Policy record identifier |
| `org_id` | `UUID` | NOT NULL, UNIQUE, FK → `organisations.id` ON DELETE CASCADE | Enforces one-policy-per-org |
| `single_purchase_limit` | `NUMERIC(12,2)` | NOT NULL, default `10000.00` | Hard ceiling for a single request (USD) |
| `require_justification_above` | `NUMERIC(12,2)` | NOT NULL, default `500.00` | Justification required above this amount |
| `auto_approve_below` | `NUMERIC(12,2)` | NOT NULL, default `100.00` | Requests below this skip manager approval |
| `require_manager_approval_above` | `NUMERIC(12,2)` | NOT NULL, default `1000.00` | Manager must approve above this amount |
| `allowed_categories` | `TEXT[]` | NOT NULL, default `'{}'` | Whitelist of spend categories; empty = all allowed |
| `blocked_vendors` | `TEXT[]` | NOT NULL, default `'{}'` | Denylist of vendor names/domains |
| `updated_by` | `UUID` | FK → `users.id` SET NULL | Last admin to modify the policy |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | — |

---

## Table 5: `budgets`

Budget envelopes scoped to a category and time period.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Budget identifier |
| `org_id` | `UUID` | NOT NULL, FK → `organisations.id` ON DELETE CASCADE | Owning organisation |
| `name` | `VARCHAR(255)` | NOT NULL | Human-readable label (e.g. "Q4 2024 Operations") |
| `category` | `VARCHAR(100)` | NOT NULL | Spend category this budget covers |
| `total_amount` | `NUMERIC(14,2)` | NOT NULL, CHECK > 0 | Total allocated budget |
| `spent_amount` | `NUMERIC(14,2)` | NOT NULL, default `0.00` | Realised spend (updated via ledger) |
| `period_start` | `DATE` | NOT NULL | Budget period start (inclusive) |
| `period_end` | `DATE` | NOT NULL | Budget period end (inclusive) |
| `is_active` | `BOOLEAN` | NOT NULL, default `true` | Only active budgets receive charges |
| `created_by` | `UUID` | FK → `users.id` SET NULL | Admin who created this budget |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | — |

**Indexes:** `INDEX(org_id, category, is_active)`, `INDEX(period_start, period_end)`

**Constraint:** `CHECK (period_end >= period_start)`

---

## Table 6: `purchase_requests`

Core entity representing a procurement request submitted by an employee.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Request identifier |
| `org_id` | `UUID` | NOT NULL, FK → `organisations.id` ON DELETE CASCADE | Owning organisation |
| `requester_id` | `UUID` | NOT NULL, FK → `users.id` SET NULL | User who submitted the request |
| `title` | `VARCHAR(255)` | NOT NULL | Short title of the purchase |
| `vendor` | `VARCHAR(255)` | NOT NULL | Vendor / supplier name |
| `category` | `VARCHAR(100)` | NOT NULL | Spend category |
| `amount` | `NUMERIC(14,2)` | NOT NULL, CHECK > 0 | Requested amount |
| `currency` | `CHAR(3)` | NOT NULL, default `'USD'` | ISO 4217 currency code |
| `description` | `TEXT` | NULLABLE | Optional detailed description |
| `justification` | `TEXT` | NULLABLE | Business justification |
| `status` | `VARCHAR(20)` | NOT NULL, default `'pending'`, CHECK IN (`draft`, `pending`, `approved`, `rejected`, `paid`, `cancelled`) | Lifecycle state |
| `policy_breach` | `BOOLEAN` | NOT NULL, default `false` | True if request violates a policy rule |
| `policy_breach_reason` | `TEXT` | NULLABLE | Human-readable policy violation explanation |
| `budget_id` | `UUID` | NULLABLE, FK → `budgets.id` SET NULL | Linked budget envelope |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | — |

**Indexes:** `INDEX(org_id, status)`, `INDEX(requester_id)`, `INDEX(budget_id)`

---

## Table 7: `ai_assessments`

Stores the advisory AI risk assessment for each purchase request. One-to-one with `purchase_requests`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Assessment identifier |
| `request_id` | `UUID` | NOT NULL, UNIQUE, FK → `purchase_requests.id` ON DELETE CASCADE | Linked request |
| `risk_score` | `NUMERIC(4,3)` | NOT NULL, CHECK BETWEEN 0 AND 1 | 0.000 (no risk) to 1.000 (critical risk) |
| `recommendation` | `VARCHAR(10)` | NOT NULL, CHECK IN (`approve`, `review`, `reject`) | AI advisory recommendation |
| `reasoning` | `TEXT` | NOT NULL | Sanitised AI reasoning paragraph |
| `flags` | `TEXT[]` | NOT NULL, default `'{}'` | Array of flag labels (e.g. `{"high_amount","missing_justification"}`) |
| `model_used` | `VARCHAR(100)` | NOT NULL | Model identifier used for this assessment |
| `assessed_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | When the assessment was completed |

> [!IMPORTANT]
> The `reasoning` field is passed through the sanitizer before storage. It must never contain financial-action language.

---

## Table 8: `approvals`

Approval decisions made by managers or admins on purchase requests.
A request may have multiple approval records if it goes through multi-stage approval.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Approval record identifier |
| `request_id` | `UUID` | NOT NULL, FK → `purchase_requests.id` ON DELETE CASCADE | Linked request |
| `approver_id` | `UUID` | NOT NULL, FK → `users.id` SET NULL | User who made the decision |
| `decision` | `VARCHAR(10)` | NOT NULL, CHECK IN (`approved`, `rejected`) | The decision |
| `note` | `TEXT` | NULLABLE | Optional approver note / comment |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | When the decision was recorded |

**Indexes:** `INDEX(request_id)`, `INDEX(approver_id)`

---

## Table 9: `transactions`

Financial transaction records linked to fully-approved purchase requests.
Each transaction corresponds to one PayPal order capture.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Internal transaction identifier |
| `request_id` | `UUID` | NOT NULL, UNIQUE, FK → `purchase_requests.id` | Linked purchase request (one-to-one) |
| `org_id` | `UUID` | NOT NULL, FK → `organisations.id` | Organisation (denormalised for reporting) |
| `paypal_order_id` | `VARCHAR(100)` | NOT NULL | PayPal order ID (`5O190...`) |
| `paypal_capture_id` | `VARCHAR(100)` | NULLABLE | PayPal capture ID (populated after capture) |
| `amount` | `NUMERIC(14,2)` | NOT NULL | Captured amount |
| `currency` | `CHAR(3)` | NOT NULL | Currency code |
| `status` | `VARCHAR(20)` | NOT NULL, default `'CREATED'`, CHECK IN (`CREATED`, `APPROVED`, `COMPLETED`, `VOIDED`, `FAILED`) | PayPal order lifecycle status |
| `idempotency_key` | `VARCHAR(100)` | NOT NULL, UNIQUE | Prevents duplicate PayPal order creation |
| `paypal_response` | `JSONB` | NULLABLE | Full PayPal API response (for audit/debug) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | — |

**Indexes:** `UNIQUE(paypal_order_id)`, `UNIQUE(idempotency_key)`, `INDEX(org_id, status)`

---

## Table 10: `budget_ledger`

Immutable double-entry-style ledger recording budget charges and adjustments.
`budgets.spent_amount` is a materialised sum of matching ledger entries.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BIGSERIAL` | PK | Auto-incrementing ledger entry ID |
| `budget_id` | `UUID` | NOT NULL, FK → `budgets.id` ON DELETE RESTRICT | Affected budget |
| `transaction_id` | `UUID` | NULLABLE, FK → `transactions.id` SET NULL | Linked payment (nullable for manual adjustments) |
| `request_id` | `UUID` | NULLABLE, FK → `purchase_requests.id` SET NULL | Linked request |
| `amount` | `NUMERIC(14,2)` | NOT NULL | Positive = charge; Negative = credit/reversal |
| `description` | `TEXT` | NOT NULL | Human-readable description of the entry |
| `created_by` | `UUID` | FK → `users.id` SET NULL | User or system actor |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | Immutable creation timestamp |

**Indexes:** `INDEX(budget_id)`, `INDEX(transaction_id)`

> [!NOTE]
> Never `UPDATE` or `DELETE` ledger entries. Issue a correcting entry instead to maintain an audit trail.

---

## Table 11: `audit_logs`

Append-only record of all significant actions taken in the system.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | PK | Log entry identifier |
| `org_id` | `UUID` | NOT NULL, FK → `organisations.id` ON DELETE CASCADE | Tenant |
| `actor_id` | `UUID` | NULLABLE, FK → `users.id` SET NULL | User who performed the action (null = system) |
| `action` | `VARCHAR(100)` | NOT NULL | Dot-namespaced action string (e.g. `request.submitted`, `approval.approved`) |
| `entity_type` | `VARCHAR(50)` | NOT NULL | Type of entity affected (`request`, `user`, `policy`, `budget`, `transaction`) |
| `entity_id` | `UUID` | NOT NULL | ID of the affected entity |
| `metadata` | `JSONB` | NULLABLE | Arbitrary context (old/new values, notes, IP address) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | Immutable timestamp |

**Indexes:**
- `INDEX(org_id, created_at DESC)` — tenant audit log pagination
- `INDEX(entity_type, entity_id)` — per-entity history
- `INDEX(actor_id)` — per-user activity

> [!CAUTION]
> Audit logs must never be deleted or altered. Apply PostgreSQL row-level security to prevent `DELETE` and `UPDATE` even by superusers via application roles.

---

## Migrations

Migrations are managed with **node-pg-migrate** and live in `backend/migrations/`.

```bash
# Run all pending migrations
npm run migrate:up

# Roll back the last migration
npm run migrate:down

# Seed reference data
npm run seed
```

Migration files follow the naming convention: `{timestamp}_{description}.js`  
Example: `1731000000000_create_organisations.js`
