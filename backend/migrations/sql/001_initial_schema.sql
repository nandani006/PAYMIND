-- ============================================================
-- PAYMIND Enterprise — Database Schema Migration
-- File: 001_initial_schema.sql
-- Safe to rerun: uses CREATE TABLE IF NOT EXISTS and IF NOT EXISTS indexes
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── organisations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organisations (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(255) NOT NULL,
  domain            VARCHAR(255),
  subscription_plan VARCHAR(50)  NOT NULL DEFAULT 'starter',
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organisations_domain
  ON organisations(domain) WHERE domain IS NOT NULL;

-- ── users ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID         NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  role          VARCHAR(30)  NOT NULL DEFAULT 'employee'
                  CHECK (role IN ('super_admin','org_admin','finance_manager','manager','employee')),
  department    VARCHAR(100),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(org_id, role);

-- ── token_blocklist ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS token_blocklist (
  id          SERIAL      PRIMARY KEY,
  token_jti   VARCHAR(36) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_blocklist_jti        ON token_blocklist(token_jti);
CREATE INDEX IF NOT EXISTS idx_token_blocklist_expires_at ON token_blocklist(expires_at);

-- ── spending_policies ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spending_policies (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID          NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name                    VARCHAR(255)  NOT NULL,
  single_purchase_limit   NUMERIC(12,2) NOT NULL,
  monthly_budget_limit    NUMERIC(12,2),
  requires_approval_above NUMERIC(12,2) NOT NULL DEFAULT 0,
  auto_approve_below      NUMERIC(12,2) NOT NULL DEFAULT 0,
  allowed_categories      JSONB         NOT NULL DEFAULT '[]',
  blocked_vendors         JSONB         NOT NULL DEFAULT '[]',
  is_active               BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policies_org_id ON spending_policies(org_id);

-- ── budgets ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID          NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  department   VARCHAR(100),
  total_amount NUMERIC(14,2) NOT NULL,
  currency     CHAR(3)       NOT NULL DEFAULT 'USD',
  period       VARCHAR(20)   NOT NULL DEFAULT 'monthly'
                 CHECK (period IN ('monthly','quarterly','annual')),
  period_start DATE          NOT NULL,
  period_end   DATE          NOT NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT budgets_date_range_check CHECK (period_end > period_start)
);

CREATE INDEX IF NOT EXISTS idx_budgets_org_id ON budgets(org_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(org_id, period_start, period_end);

-- ── purchase_requests ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_requests (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID          NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  requester_id     UUID          NOT NULL REFERENCES users(id),
  budget_id        UUID          REFERENCES budgets(id),
  title            VARCHAR(255)  NOT NULL,
  description      TEXT,
  vendor           VARCHAR(255)  NOT NULL,
  category         VARCHAR(100)  NOT NULL,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency         CHAR(3)       NOT NULL DEFAULT 'USD',
  justification    TEXT,
  status           VARCHAR(30)   NOT NULL DEFAULT 'pending_ai'
                     CHECK (status IN (
                       'draft','pending_ai','policy_check','pending_approval',
                       'approved','payment_initiated','completed','rejected','cancelled'
                     )),
  rejection_reason TEXT,
  idempotency_key  VARCHAR(255)  UNIQUE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_org_id       ON purchase_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_requests_requester_id ON purchase_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_status       ON purchase_requests(org_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at   ON purchase_requests(org_id, created_at DESC);

-- ── ai_assessments ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_assessments (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id     UUID          NOT NULL UNIQUE REFERENCES purchase_requests(id) ON DELETE CASCADE,
  risk_score     NUMERIC(4,3)  NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  recommendation VARCHAR(10)   NOT NULL CHECK (recommendation IN ('approve','review','reject')),
  reasoning      TEXT          NOT NULL,
  flags          JSONB         NOT NULL DEFAULT '[]',
  model_used     VARCHAR(100)  NOT NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_assessments_request_id ON ai_assessments(request_id);

-- ── approval_records ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approval_records (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID        NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  approver_id UUID        NOT NULL REFERENCES users(id),
  decision    VARCHAR(10) NOT NULL CHECK (decision IN ('approved','rejected')),
  comments    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approvals_request_id  ON approval_records(request_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver_id ON approval_records(approver_id);

-- ── transactions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID          NOT NULL REFERENCES organisations(id),
  request_id        UUID          NOT NULL REFERENCES purchase_requests(id),
  paypal_order_id   VARCHAR(100)  NOT NULL UNIQUE,
  paypal_capture_id VARCHAR(100),
  amount            NUMERIC(12,2) NOT NULL,
  currency          CHAR(3)       NOT NULL DEFAULT 'USD',
  status            VARCHAR(20)   NOT NULL DEFAULT 'created'
                      CHECK (status IN ('created','completed','failed','refunded')),
  idempotency_key   VARCHAR(255)  UNIQUE,
  captured_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_org_id     ON transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_request_id ON transactions(request_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id   ON transactions(paypal_order_id);

-- ── audit_logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     UUID        REFERENCES users(id),
  org_id       UUID        NOT NULL REFERENCES organisations(id),
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(100) NOT NULL,
  entity_id    UUID,
  before_state JSONB,
  after_state  JSONB,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_org_id      ON audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor_id    ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity      ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action      ON audit_logs(action);

-- ── vendors (reference table for known vendors) ───────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  website    VARCHAR(500),
  category   VARCHAR(100),
  is_blocked BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_org_name ON vendors(org_id, name);

-- ── migrations tracking table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('001_initial_schema')
ON CONFLICT (version) DO NOTHING;

