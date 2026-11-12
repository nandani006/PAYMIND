const express = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { auditService } = require('../services/auditService');

const router = express.Router();

router.use(authenticate);

// ── GET /api/organisations/me ─────────────────────────────────────────────────
router.get('/me', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, domain, subscription_plan, is_active, created_at
         FROM organisations WHERE id = $1`,
      [req.user.org_id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Organisation not found.' });
    }
    res.json({ organisation: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/organisations/me ───────────────────────────────────────────────
router.patch('/me', requireRole('org_admin', 'super_admin'), async (req, res, next) => {
  try {
    const { name, domain } = req.body;
    if (!name && !domain) {
      return res.status(400).json({ message: 'Provide at least one field to update.' });
    }

    if (name && (typeof name !== 'string' || name.trim().length < 2 || name.length > 255)) {
      return res.status(400).json({ message: 'Organisation name must be between 2 and 255 characters.' });
    }
    if (domain && (typeof domain !== 'string' || domain.length > 255 || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain.trim()))) {
      return res.status(400).json({ message: 'Invalid corporate domain format.' });
    }

    const cleanName = name ? name.trim() : null;
    const cleanDomain = domain ? domain.trim().toLowerCase() : null;

    const result = await query(
      `UPDATE organisations
          SET name   = COALESCE($1, name),
              domain = COALESCE($2, domain),
              updated_at = NOW()
        WHERE id = $3
        RETURNING id, name, domain, subscription_plan, is_active, updated_at`,
      [cleanName, cleanDomain, req.user.org_id]
    );

    await auditService.log({
      actorId: req.user.id,
      orgId: req.user.org_id,
      action: 'update_organisation',
      entityType: 'organisation',
      entityId: req.user.org_id,
      afterState: { name, domain },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ organisation: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/organisations/stats ──────────────────────────────────────────────
router.get('/stats', requireRole('org_admin', 'finance_manager', 'super_admin'), async (req, res, next) => {
  try {
    const [userCount, requestCount, spendResult] = await Promise.all([
      query('SELECT COUNT(*) FROM users WHERE org_id = $1 AND is_active = true', [req.user.org_id]),
      query('SELECT COUNT(*) FROM purchase_requests WHERE org_id = $1', [req.user.org_id]),
      query(
        `SELECT COALESCE(SUM(amount), 0) AS total_spend
           FROM purchase_requests
          WHERE org_id = $1 AND status = 'completed'`,
        [req.user.org_id]
      ),
    ]);

    res.json({
      active_users: parseInt(userCount.rows[0].count, 10),
      total_requests: parseInt(requestCount.rows[0].count, 10),
      total_spend: parseFloat(spendResult.rows[0].total_spend),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

