const express = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAtLeast } = require('../middleware/rbac');
const { schemas, validate } = require('../utils/validators');
const { auditService } = require('../services/auditService');

const router = express.Router();

router.use(authenticate);

// ── GET /api/budgets ──────────────────────────────────────────────────────────
router.get('/', requireAtLeast('manager'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT b.*,
              COALESCE(SUM(pr.amount) FILTER (WHERE pr.status IN ('approved','payment_initiated','completed')), 0) AS spent_amount
         FROM budgets b
         LEFT JOIN purchase_requests pr ON pr.budget_id = b.id
        WHERE b.org_id = $1
        GROUP BY b.id
        ORDER BY b.period_start DESC`,
      [req.user.org_id]
    );
    res.json({ budgets: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/budgets/:id/summary ──────────────────────────────────────────────
router.get('/:id/summary', requireAtLeast('manager'), async (req, res, next) => {
  try {
    const budgetResult = await query(
      'SELECT * FROM budgets WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (!budgetResult.rows.length) {
      return res.status(404).json({ message: 'Budget not found.' });
    }

    const budget = budgetResult.rows[0];

    const spendResult = await query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE status IN ('approved','payment_initiated','completed')), 0) AS approved_spend,
         COALESCE(SUM(amount) FILTER (WHERE status = 'pending_approval'), 0) AS pending_spend,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed_requests,
         COUNT(*) FILTER (WHERE status = 'pending_approval') AS pending_requests
         FROM purchase_requests
        WHERE budget_id = $1`,
      [req.params.id]
    );

    const spend = spendResult.rows[0];

    res.json({
      budget,
      summary: {
        total_amount: parseFloat(budget.total_amount),
        approved_spend: parseFloat(spend.approved_spend),
        pending_spend: parseFloat(spend.pending_spend),
        remaining: parseFloat(budget.total_amount) - parseFloat(spend.approved_spend),
        utilisation_pct: budget.total_amount > 0
          ? Math.round((spend.approved_spend / budget.total_amount) * 100)
          : 0,
        completed_requests: parseInt(spend.completed_requests, 10),
        pending_requests: parseInt(spend.pending_requests, 10),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/budgets ─────────────────────────────────────────────────────────
router.post(
  '/',
  requireAtLeast('finance_manager'),
  validate(schemas.createBudget),
  async (req, res, next) => {
    try {
      const { department, total_amount, currency, period, period_start, period_end } = req.body;

      const result = await query(
        `INSERT INTO budgets (org_id, department, total_amount, currency, period, period_start, period_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [req.user.org_id, department || null, total_amount, currency || 'USD', period || 'monthly', period_start, period_end]
      );

      await auditService.log({
        actorId: req.user.id,
        orgId: req.user.org_id,
        action: 'create_budget',
        entityType: 'budget',
        entityId: result.rows[0].id,
        afterState: { department, total_amount, period },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json({ budget: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;

