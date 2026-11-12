const express = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAtLeast } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate);

// ── GET /api/dashboard/summary ────────────────────────────────────────────────
router.get('/summary', async (req, res, next) => {
  try {
    const isManagerOrAbove = ['manager', 'finance_manager', 'org_admin', 'super_admin'].includes(req.user.role);

    // For employees: only their own stats. For managers+: org-wide.
    const orgFilter = isManagerOrAbove ? 'pr.org_id = $1' : 'pr.org_id = $1 AND pr.requester_id = $2';
    const params = isManagerOrAbove ? [req.user.org_id] : [req.user.org_id, req.user.id];

    const summaryResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE pr.status = 'pending_approval') AS pending_count,
         COUNT(*) FILTER (WHERE pr.status = 'approved')         AS approved_count,
         COUNT(*) FILTER (WHERE pr.status = 'completed')        AS completed_count,
         COUNT(*) FILTER (WHERE pr.status = 'rejected')         AS rejected_count,
         COUNT(*) FILTER (WHERE pr.created_at >= NOW() - INTERVAL '30 days') AS requests_this_month,
         COALESCE(SUM(pr.amount) FILTER (WHERE pr.status = 'completed'), 0) AS total_spend,
         COALESCE(SUM(pr.amount) FILTER (WHERE pr.status = 'completed' AND pr.created_at >= NOW() - INTERVAL '30 days'), 0) AS spend_this_month
       FROM purchase_requests pr
       WHERE ${orgFilter}`,
      params
    );

    // Active budget for org
    const budgetResult = await query(
      `SELECT SUM(total_amount) AS total_budget
         FROM budgets
        WHERE org_id = $1
          AND period_start <= NOW() AND period_end >= NOW()`,
      [req.user.org_id]
    );

    const summary = summaryResult.rows[0];
    const totalBudget = parseFloat(budgetResult.rows[0].total_budget || 0);
    const spendThisMonth = parseFloat(summary.spend_this_month);

    res.json({
      pending_count: parseInt(summary.pending_count, 10),
      approved_count: parseInt(summary.approved_count, 10),
      completed_count: parseInt(summary.completed_count, 10),
      rejected_count: parseInt(summary.rejected_count, 10),
      requests_this_month: parseInt(summary.requests_this_month, 10),
      total_spend: parseFloat(summary.total_spend),
      spend_this_month: spendThisMonth,
      total_budget: totalBudget,
      budget_utilisation_pct: totalBudget > 0 ? Math.round((spendThisMonth / totalBudget) * 100) : 0,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/dashboard/spend-trend ───────────────────────────────────────────
router.get('/spend-trend', requireAtLeast('manager'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
         DATE_TRUNC('month', created_at) AS month_date,
         COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS completed_spend,
         COALESCE(SUM(amount) FILTER (WHERE status = 'rejected'), 0) AS rejected_amount,
         COUNT(*) AS total_requests
       FROM purchase_requests
       WHERE org_id = $1
         AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month_date ASC`,
      [req.user.org_id]
    );

    res.json({
      trend: result.rows.map(r => ({
        month: r.month,
        spend: parseFloat(r.completed_spend),
        rejected: parseFloat(r.rejected_amount),
        requests: parseInt(r.total_requests, 10),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/dashboard/top-vendors ────────────────────────────────────────────
router.get('/top-vendors', requireAtLeast('manager'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         vendor,
         COUNT(*) AS request_count,
         COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS total_spend
       FROM purchase_requests
       WHERE org_id = $1
         AND status = 'completed'
         AND created_at >= NOW() - INTERVAL '90 days'
       GROUP BY vendor
       ORDER BY total_spend DESC
       LIMIT 10`,
      [req.user.org_id]
    );

    res.json({
      vendors: result.rows.map(r => ({
        vendor: r.vendor,
        request_count: parseInt(r.request_count, 10),
        total_spend: parseFloat(r.total_spend),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/dashboard/category-breakdown ─────────────────────────────────────
router.get('/category-breakdown', requireAtLeast('manager'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         category,
         COUNT(*) AS count,
         COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS total_spend
       FROM purchase_requests
       WHERE org_id = $1
         AND created_at >= NOW() - INTERVAL '90 days'
       GROUP BY category
       ORDER BY total_spend DESC`,
      [req.user.org_id]
    );

    res.json({
      categories: result.rows.map(r => ({
        category: r.category,
        count: parseInt(r.count, 10),
        total_spend: parseFloat(r.total_spend),
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

