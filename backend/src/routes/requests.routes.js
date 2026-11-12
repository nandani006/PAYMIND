const express = require('express');
const axios = require('axios');
const { query, getClient } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAtLeast } = require('../middleware/rbac');
const { schemas, validate } = require('../utils/validators');
const { auditService } = require('../services/auditService');

const router = express.Router();

router.use(authenticate);

// ── Helper: Run deterministic policy check ────────────────────────────────────
async function runPolicyCheck(orgId, amount, category, vendor) {
  const policyResult = await query(
    `SELECT * FROM spending_policies WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [orgId]
  );

  if (!policyResult.rows.length) {
    return { passed: true, policy: null, reason: null };
  }

  const policy = policyResult.rows[0];

  if (amount > policy.single_purchase_limit) {
    return {
      passed: false,
      policy,
      reason: `Amount $${amount} exceeds single purchase limit of $${policy.single_purchase_limit}.`,
    };
  }

  const allowedCategories = Array.isArray(policy.allowed_categories)
    ? policy.allowed_categories
    : (policy.allowed_categories ? JSON.parse(policy.allowed_categories) : []);

  if (allowedCategories.length > 0 && !allowedCategories.includes(category)) {
    return {
      passed: false,
      policy,
      reason: `Category "${category}" is not in the allowed categories list.`,
    };
  }

  const blockedVendors = Array.isArray(policy.blocked_vendors)
    ? policy.blocked_vendors
    : (policy.blocked_vendors ? JSON.parse(policy.blocked_vendors) : []);

  if (blockedVendors.some(v => v.toLowerCase() === vendor.toLowerCase())) {
    return {
      passed: false,
      policy,
      reason: `Vendor "${vendor}" is on the blocked vendors list.`,
    };
  }

  return { passed: true, policy, reason: null };
}

// ── Helper: Call AI assessment service ───────────────────────────────────────
async function callAiAssessment(request, policy) {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const aiApiKey = process.env.AI_SERVICE_API_KEY;

  // Retrieve recent organisation purchases for duplicate and pattern analysis
  let recentPurchases = [];
  try {
    const recentRes = await query(
      `SELECT id, title, vendor, category, amount, currency, status, created_at
         FROM purchase_requests
        WHERE org_id = $1 AND id != $2
        ORDER BY created_at DESC
        LIMIT 10`,
      [request.org_id, request.id]
    );
    recentPurchases = recentRes.rows.map(r => ({
      id: r.id,
      title: r.title,
      vendor: r.vendor,
      category: r.category,
      amount: parseFloat(r.amount),
      currency: r.currency,
      status: r.status,
      created_at: r.created_at ? r.created_at.toISOString() : null,
    }));
  } catch (err) {
    console.warn('[AI Pipeline] Could not fetch recent purchases for duplicate analysis:', err.message);
  }

  const payload = {
    request_id: request.id,
    title: request.title,
    vendor: request.vendor,
    category: request.category,
    amount: parseFloat(request.amount),
    currency: request.currency || 'USD',
    description: request.description || '',
    justification: request.justification || '',
    recent_purchases: recentPurchases,
    policy_context: policy
      ? {
          single_purchase_limit: parseFloat(policy.single_purchase_limit),
          allowed_categories: Array.isArray(policy.allowed_categories)
            ? policy.allowed_categories
            : JSON.parse(policy.allowed_categories || '[]'),
          blocked_vendors: Array.isArray(policy.blocked_vendors)
            ? policy.blocked_vendors
            : JSON.parse(policy.blocked_vendors || '[]'),
        }
      : null,
  };

  if (!aiApiKey) {
    throw new Error('AI_SERVICE_API_KEY environment variable is not configured on the backend.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Internal-Key': aiApiKey,
  };

  const response = await axios.post(`${aiServiceUrl}/assess`, payload, {
    headers,
    timeout: parseInt(process.env.AI_SERVICE_TIMEOUT_MS || '10000'),
  });

  return response.data;
}

// ── GET /api/requests ─────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const isManagerOrAbove = ['manager', 'finance_manager', 'org_admin', 'super_admin'].includes(req.user.role);

    const result = await query(
      `SELECT pr.*,
              u.full_name AS requester_name,
              u.email AS requester_email,
              u.department,
              a.risk_score, a.recommendation, a.reasoning, a.flags,
              a.model_used AS ai_model_used
         FROM purchase_requests pr
         JOIN users u ON u.id = pr.requester_id
         LEFT JOIN ai_assessments a ON a.request_id = pr.id
        WHERE pr.org_id = $1
          AND ($2 OR pr.requester_id = $3)
        ORDER BY pr.created_at DESC
        LIMIT 100`,
      [req.user.org_id, isManagerOrAbove, req.user.id]
    );

    res.json({ requests: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/requests/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const isManagerOrAbove = ['manager', 'finance_manager', 'org_admin', 'super_admin'].includes(req.user.role);

    const result = await query(
      `SELECT pr.*,
              u.full_name AS requester_name,
              u.email AS requester_email,
              u.department,
              a.risk_score, a.recommendation, a.reasoning, a.flags,
              a.model_used AS ai_model_used
         FROM purchase_requests pr
         JOIN users u ON u.id = pr.requester_id
         LEFT JOIN ai_assessments a ON a.request_id = pr.id
        WHERE pr.id = $1 AND pr.org_id = $2
          AND ($3 OR pr.requester_id = $4)`,
      [req.params.id, req.user.org_id, isManagerOrAbove, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Request not found.' });
    }

    // Fetch approval history
    const approvals = await query(
      `SELECT ar.*, u.full_name AS approver_name
         FROM approval_records ar
         JOIN users u ON u.id = ar.approver_id
        WHERE ar.request_id = $1
        ORDER BY ar.created_at ASC`,
      [req.params.id]
    );

    res.json({ request: result.rows[0], approvals: approvals.rows });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/requests ────────────────────────────────────────────────────────
router.post('/', validate(schemas.createRequest), async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { title, description, vendor, category, amount, currency, justification, idempotency_key } = req.body;

    // Idempotency check
    if (idempotency_key) {
      const existing = await client.query(
        'SELECT id, status FROM purchase_requests WHERE idempotency_key = $1 AND requester_id = $2',
        [idempotency_key, req.user.id]
      );
      if (existing.rows.length) {
        await client.query('ROLLBACK');
        return res.status(200).json({ request: existing.rows[0], idempotent: true });
      }
    }

    // Insert as draft
    const insertResult = await client.query(
      `INSERT INTO purchase_requests
         (org_id, requester_id, title, description, vendor, category,
          amount, currency, justification, idempotency_key, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending_ai')
       RETURNING *`,
      [req.user.org_id, req.user.id, title, description || null, vendor,
       category, amount, currency || 'USD', justification || null, idempotency_key || null]
    );

    const newRequest = insertResult.rows[0];
    await client.query('COMMIT');

    // Async: run policy check then AI assessment (after response sent)
    res.status(201).json({ request: newRequest });

    // Post-response pipeline (non-blocking)
    setImmediate(async () => {
      try {
        // 1. Policy check (deterministic)
        const policyCheck = await runPolicyCheck(req.user.org_id, amount, category, vendor);

        if (!policyCheck.passed) {
          await query(
            `UPDATE purchase_requests
                SET status = 'rejected',
                    rejection_reason = $1,
                    updated_at = NOW()
              WHERE id = $2`,
            [policyCheck.reason, newRequest.id]
          );

          await auditService.log({
            actorId: req.user.id,
            orgId: req.user.org_id,
            action: 'policy_rejection',
            entityType: 'purchase_request',
            entityId: newRequest.id,
            afterState: { reason: policyCheck.reason },
          });
          return;
        }

        // Update to policy_check passed
        await query(
          `UPDATE purchase_requests SET status = 'policy_check', updated_at = NOW() WHERE id = $1`,
          [newRequest.id]
        );

        // 2. AI assessment
        let aiResult = null;
        try {
          aiResult = await callAiAssessment(newRequest, policyCheck.policy);

          await query(
            `INSERT INTO ai_assessments
               (request_id, risk_score, recommendation, reasoning, flags, model_used)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (request_id) DO UPDATE
               SET risk_score = EXCLUDED.risk_score,
                   recommendation = EXCLUDED.recommendation,
                   reasoning = EXCLUDED.reasoning,
                   flags = EXCLUDED.flags,
                   model_used = EXCLUDED.model_used,
                   created_at = NOW()`,
            [
              newRequest.id,
              aiResult.risk_score,
              aiResult.recommendation,
              aiResult.reasoning,
              JSON.stringify({
                risk_level: aiResult.risk_level || (aiResult.risk_score < 0.3 ? 'low' : aiResult.risk_score < 0.7 ? 'medium' : 'high'),
                risk_factors: aiResult.risk_factors || [],
                duplicate_risk: aiResult.duplicate_risk || 'low',
                policy_observations: aiResult.policy_observations || [],
                category: aiResult.category || newRequest.category,
                purpose: aiResult.purpose || newRequest.title,
                business_justification: aiResult.business_justification || newRequest.justification,
                flags: aiResult.flags || [],
              }),
              aiResult.model_used,
            ]
          );
        } catch (aiErr) {
          console.warn('[AI] Assessment failed, routing to manual review:', aiErr.message);
          // If AI unavailable → route to manual approval (never auto-approve)
        }

        // 3. Determine next status
        const autoApproveBelow = policyCheck.policy?.auto_approve_below || 0;
        const requiresApprovalAbove = policyCheck.policy?.requires_approval_above ?? 0;

        let nextStatus = 'pending_approval';

        if (aiResult && aiResult.recommendation === 'reject' && aiResult.risk_score > 0.7) {
          nextStatus = 'rejected';
          await query(
            `UPDATE purchase_requests
                SET status = 'rejected',
                    rejection_reason = $1,
                    updated_at = NOW()
              WHERE id = $2`,
            [`AI assessment: ${aiResult.reasoning}`, newRequest.id]
          );

          await auditService.log({
            actorId: req.user.id,
            orgId: req.user.org_id,
            action: 'ai_rejection',
            entityType: 'purchase_request',
            entityId: newRequest.id,
            afterState: { risk_score: aiResult.risk_score, reasoning: aiResult.reasoning },
          });
          return;
        }

        if (amount <= autoApproveBelow && aiResult?.recommendation === 'approve') {
          nextStatus = 'approved';
        }

        await query(
          `UPDATE purchase_requests SET status = $1, updated_at = NOW() WHERE id = $2`,
          [nextStatus, newRequest.id]
        );
      } catch (pipelineErr) {
        console.error('[Request Pipeline] Error:', pipelineErr.message);
        // Fallback: route to manual approval
        await query(
          `UPDATE purchase_requests SET status = 'pending_approval', updated_at = NOW() WHERE id = $1`,
          [newRequest.id]
        ).catch(() => {});
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── PATCH /api/requests/:id/cancel ────────────────────────────────────────────
router.patch('/:id/cancel', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE purchase_requests
          SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1 AND requester_id = $2
          AND status IN ('draft','pending_ai','policy_check','pending_approval')
        RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Request not found or cannot be cancelled.' });
    }

    await auditService.log({
      actorId: req.user.id,
      orgId: req.user.org_id,
      action: 'cancel_request',
      entityType: 'purchase_request',
      entityId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ request: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

