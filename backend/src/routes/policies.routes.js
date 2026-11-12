const express = require('express');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAtLeast, requireRole } = require('../middleware/rbac');
const { schemas, validate } = require('../utils/validators');
const { auditService } = require('../services/auditService');

const router = express.Router();

router.use(authenticate);

// ── GET /api/policies ─────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM spending_policies
        WHERE org_id = $1
        ORDER BY created_at DESC`,
      [req.user.org_id]
    );
    res.json({ policies: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/policies/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM spending_policies WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Policy not found.' });
    }
    res.json({ policy: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/policies ────────────────────────────────────────────────────────
router.post(
  '/',
  requireAtLeast('finance_manager'),
  validate(schemas.createPolicy),
  async (req, res, next) => {
    try {
      const {
        name,
        single_purchase_limit,
        monthly_budget_limit,
        requires_approval_above,
        auto_approve_below,
        allowed_categories,
        blocked_vendors,
      } = req.body;

      const result = await query(
        `INSERT INTO spending_policies
           (org_id, name, single_purchase_limit, monthly_budget_limit,
            requires_approval_above, auto_approve_below, allowed_categories, blocked_vendors)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          req.user.org_id,
          name,
          single_purchase_limit,
          monthly_budget_limit || null,
          requires_approval_above,
          auto_approve_below || 0,
          JSON.stringify(allowed_categories || []),
          JSON.stringify(blocked_vendors || []),
        ]
      );

      await auditService.log({
        actorId: req.user.id,
        orgId: req.user.org_id,
        action: 'create_policy',
        entityType: 'spending_policy',
        entityId: result.rows[0].id,
        afterState: { name, single_purchase_limit },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.status(201).json({ policy: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ── PUT /api/policies/:id ─────────────────────────────────────────────────────
router.put(
  '/:id',
  requireAtLeast('finance_manager'),
  validate(schemas.createPolicy),
  async (req, res, next) => {
    try {
      const existing = await query(
        'SELECT * FROM spending_policies WHERE id = $1 AND org_id = $2',
        [req.params.id, req.user.org_id]
      );
      if (!existing.rows.length) {
        return res.status(404).json({ message: 'Policy not found.' });
      }

      const {
        name,
        single_purchase_limit,
        monthly_budget_limit,
        requires_approval_above,
        auto_approve_below,
        allowed_categories,
        blocked_vendors,
      } = req.body;

      const result = await query(
        `UPDATE spending_policies SET
           name                   = $1,
           single_purchase_limit  = $2,
           monthly_budget_limit   = $3,
           requires_approval_above= $4,
           auto_approve_below     = $5,
           allowed_categories     = $6,
           blocked_vendors        = $7,
           updated_at             = NOW()
         WHERE id = $8 AND org_id = $9
         RETURNING *`,
        [
          name,
          single_purchase_limit,
          monthly_budget_limit || null,
          requires_approval_above,
          auto_approve_below || 0,
          JSON.stringify(allowed_categories || []),
          JSON.stringify(blocked_vendors || []),
          req.params.id,
          req.user.org_id,
        ]
      );

      await auditService.log({
        actorId: req.user.id,
        orgId: req.user.org_id,
        action: 'update_policy',
        entityType: 'spending_policy',
        entityId: req.params.id,
        beforeState: { name: existing.rows[0].name },
        afterState: { name },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ policy: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ── DELETE /api/policies/:id ──────────────────────────────────────────────────
router.delete('/:id', requireAtLeast('finance_manager'), async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM spending_policies WHERE id = $1 AND org_id = $2 RETURNING id, name',
      [req.params.id, req.user.org_id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Policy not found.' });
    }

    await auditService.log({
      actorId: req.user.id,
      orgId: req.user.org_id,
      action: 'delete_policy',
      entityType: 'spending_policy',
      entityId: req.params.id,
      beforeState: { name: result.rows[0].name },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Policy deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

