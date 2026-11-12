require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../src/config/db');

// ─── Seed data ────────────────────────────────────────────────────────────────
// Demo org: TechNova Solutions
// All demo users share password: Demo1234!

async function run() {
  const client = await pool.connect();
  console.log('✅ Connected to PostgreSQL — running seeds\n');

  try {
    await client.query('BEGIN');

    // ── 1. Organisation ──────────────────────────────────────────────────────
    const orgResult = await client.query(
      `INSERT INTO organisations (id, name, domain, subscription_plan)
       VALUES ($1, 'TechNova Solutions', 'technovasolutions.com', 'enterprise')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      ['10000000-0000-0000-0000-000000000001']
    );

    const orgId = orgResult.rows.length
      ? orgResult.rows[0].id
      : '10000000-0000-0000-0000-000000000001';

    console.log(`  Org: TechNova Solutions (${orgId})`);

    // ── 2. Users ─────────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash('Demo1234!', 12);

    const users = [
      {
        id:   '20000000-0000-0000-0000-000000000001',
        email: 'admin@democorp.com',
        name:  'Sarah Chen',
        role:  'org_admin',
        dept:  'Administration',
      },
      {
        id:   '20000000-0000-0000-0000-000000000002',
        email: 'finance@democorp.com',
        name:  'Marcus Webb',
        role:  'finance_manager',
        dept:  'Finance',
      },
      {
        id:   '20000000-0000-0000-0000-000000000003',
        email: 'manager@democorp.com',
        name:  'Jordan Park',
        role:  'manager',
        dept:  'Engineering',
      },
      {
        id:   '20000000-0000-0000-0000-000000000004',
        email: 'employee@democorp.com',
        name:  'Alex Rivera',
        role:  'employee',
        dept:  'Engineering',
      },
      {
        id:   '20000000-0000-0000-0000-000000000005',
        email: 'design@democorp.com',
        name:  'Priya Patel',
        role:  'employee',
        dept:  'Design',
      },
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, org_id, email, password_hash, full_name, role, department)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO NOTHING`,
        [u.id, orgId, u.email, passwordHash, u.name, u.role, u.dept]
      );
      console.log(`  User: ${u.name} <${u.email}> [${u.role}]`);
    }

    // ── 3. Spending Policy ───────────────────────────────────────────────────
    await client.query(
      `INSERT INTO spending_policies
         (id, org_id, name, single_purchase_limit, monthly_budget_limit,
          requires_approval_above, auto_approve_below, allowed_categories, blocked_vendors)
       VALUES (
         '30000000-0000-0000-0000-000000000001',
         $1,
         'TechNova Standard Policy',
         5000.00,
         20000.00,
         500.00,
         100.00,
         '["Software & SaaS","Hardware & Equipment","Cloud & Infrastructure","Professional Services","Training & Development","Office Supplies"]',
         '["Shady Vendors Ltd","BlacklistCo"]'
       )
       ON CONFLICT DO NOTHING`,
      [orgId]
    );
    console.log('  Policy: TechNova Standard Policy');

    // ── 4. Budget ────────────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO budgets
         (id, org_id, department, total_amount, currency, period, period_start, period_end)
       VALUES
         ('40000000-0000-0000-0000-000000000001', $1, 'Engineering', 50000.00, 'USD', 'monthly',
          DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day'),
         ('40000000-0000-0000-0000-000000000002', $1, 'Design', 15000.00, 'USD', 'monthly',
          DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day')
       ON CONFLICT DO NOTHING`,
      [orgId]
    );
    console.log('  Budgets: Engineering $50,000 / Design $15,000');

    // ── 5. Demo Purchase Requests ────────────────────────────────────────────
    const requests = [
      {
        id:     '50000000-0000-0000-0000-000000000001',
        reqId:  '20000000-0000-0000-0000-000000000004', // Alex (employee)
        title:  'GitHub Copilot Enterprise — Annual Licence',
        vendor: 'GitHub',
        cat:    'Software & SaaS',
        amount: 1900.00,
        status: 'completed',
        just:   'AI coding assistant to increase developer productivity by est. 30%.',
      },
      {
        id:     '50000000-0000-0000-0000-000000000002',
        reqId:  '20000000-0000-0000-0000-000000000004',
        title:  'AWS EC2 Reserved Instances — 1yr',
        vendor: 'Amazon Web Services',
        cat:    'Cloud & Infrastructure',
        amount: 4800.00,
        status: 'approved',
        just:   'Reserved compute capacity for new microservices deployment.',
      },
      {
        id:     '50000000-0000-0000-0000-000000000003',
        reqId:  '20000000-0000-0000-0000-000000000005', // Priya (designer)
        title:  'Figma Professional — Team Plan',
        vendor: 'Figma',
        cat:    'Software & SaaS',
        amount: 450.00,
        status: 'pending_approval',
        just:   'Design tool for the product team.',
      },
      {
        id:     '50000000-0000-0000-0000-000000000004',
        reqId:  '20000000-0000-0000-0000-000000000004',
        title:  'Notion Team Plan — Annual',
        vendor: 'Notion Labs',
        cat:    'Software & SaaS',
        amount: 960.00,
        status: 'completed',
        just:   'Team wiki and project management.',
      },
      {
        id:     '50000000-0000-0000-0000-000000000005',
        reqId:  '20000000-0000-0000-0000-000000000005',
        title:  'Generic Laptop — no brand specified',
        vendor: 'Unknown Supplier',
        cat:    'Hardware & Equipment',
        amount: 7500.00,
        status: 'rejected',
        just:   '',
      },
    ];

    for (const r of requests) {
      await client.query(
        `INSERT INTO purchase_requests
           (id, org_id, requester_id, title, vendor, category, amount, currency, justification, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'USD', $8, $9)
         ON CONFLICT DO NOTHING`,
        [r.id, orgId, r.reqId, r.title, r.vendor, r.cat, r.amount, r.just, r.status]
      );
      console.log(`  Request: "${r.title}" [${r.status}]`);
    }

    // ── 6. AI Assessments for completed/approved requests ────────────────────
    const assessments = [
      {
        reqId: '50000000-0000-0000-0000-000000000001',
        risk: 0.12,
        rec: 'approve',
        reason: 'GitHub Copilot is a well-known, reputable vendor. Amount is within policy limits and business justification is clear.',
        flags: '["low_risk"]',
        model: 'gemini-1.5-flash',
      },
      {
        reqId: '50000000-0000-0000-0000-000000000002',
        risk: 0.28,
        rec: 'approve',
        reason: 'AWS is a trusted vendor for cloud infrastructure. Amount is below single-purchase limit. Justification is adequate.',
        flags: '["moderate_amount"]',
        model: 'gemini-1.5-flash',
      },
      {
        reqId: '50000000-0000-0000-0000-000000000003',
        risk: 0.15,
        rec: 'approve',
        reason: 'Figma is a standard design tool. Low amount, clear business purpose.',
        flags: '["low_risk"]',
        model: 'gemini-1.5-flash',
      },
      {
        reqId: '50000000-0000-0000-0000-000000000005',
        risk: 0.82,
        rec: 'reject',
        reason: 'Unknown supplier with no website or prior relationship. Amount exceeds policy single-purchase limit. No business justification provided.',
        flags: '["unknown_vendor","missing_justification","high_amount","exceeds_policy_limit"]',
        model: 'gemini-1.5-flash',
      },
    ];

    for (const a of assessments) {
      await client.query(
        `INSERT INTO ai_assessments (request_id, risk_score, recommendation, reasoning, flags, model_used)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)
         ON CONFLICT (request_id) DO NOTHING`,
        [a.reqId, a.risk, a.rec, a.reason, a.flags, a.model]
      );
    }
    console.log('  AI assessments seeded');

    // ── 7. Approval records ───────────────────────────────────────────────────
    await client.query(
      `INSERT INTO approval_records (request_id, approver_id, decision, comments)
       VALUES
         ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'approved', 'Good ROI on dev productivity.'),
         ('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'approved', 'Approved — aligns with Q4 infra plan.')
       ON CONFLICT DO NOTHING`,
    );
    console.log('  Approval records seeded');

    // ── 8. Vendors reference data ─────────────────────────────────────────────
    const knownVendors = ['GitHub','Amazon Web Services','Figma','Notion Labs','Atlassian','Slack','Zoom','Google Workspace','Microsoft 365','Datadog'];
    for (const v of knownVendors) {
      await client.query(
        `INSERT INTO vendors (org_id, name, category) VALUES ($1, $2, 'Software & SaaS')
         ON CONFLICT DO NOTHING`,
        [orgId, v]
      );
    }
    console.log('  Vendors reference data seeded');

    // ── 9. Audit log entries ──────────────────────────────────────────────────
    const auditEntries = [
      { actor: '20000000-0000-0000-0000-000000000001', action: 'register',       entity: 'user',             entityId: '20000000-0000-0000-0000-000000000001' },
      { actor: '20000000-0000-0000-0000-000000000004', action: 'create_request', entity: 'purchase_request', entityId: '50000000-0000-0000-0000-000000000001' },
      { actor: '20000000-0000-0000-0000-000000000003', action: 'approve_request', entity: 'purchase_request', entityId: '50000000-0000-0000-0000-000000000001' },
      { actor: '20000000-0000-0000-0000-000000000004', action: 'create_request', entity: 'purchase_request', entityId: '50000000-0000-0000-0000-000000000002' },
      { actor: '20000000-0000-0000-0000-000000000003', action: 'approve_request', entity: 'purchase_request', entityId: '50000000-0000-0000-0000-000000000002' },
    ];

    for (const e of auditEntries) {
      await client.query(
        `INSERT INTO audit_logs (actor_id, org_id, action, entity_type, entity_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [e.actor, orgId, e.action, e.entity, e.entityId]
      );
    }
    console.log('  Audit log entries seeded');

    await client.query('COMMIT');
    console.log('\n✅ Seed data inserted successfully.');
    console.log('\nDemo credentials (password: Demo1234!):');
    console.log('  admin@democorp.com    → Org Admin');
    console.log('  finance@democorp.com  → Finance Manager');
    console.log('  manager@democorp.com  → Manager');
    console.log('  employee@democorp.com → Employee');
    console.log('  design@democorp.com   → Employee (Design)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Seed runner failed:', err.message);
  process.exit(1);
});

