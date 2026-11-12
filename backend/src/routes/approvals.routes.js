const express = require('express');
const { query, getClient } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAtLeast } = require('../middleware/rbac');
const { schemas, validate } = require('../utils/validators');
const { auditService } = require('../services/auditService');

const router = express.Router();

router.use(authenticate);

// ── GET /api/approvals/queue ──────────────────────────────────────────────────
// Returns pending requests that this manager can approve.
router.get('/queue', requireAtLeast('manager'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT pr.*,
              u.full_name AS requester_name,
              u.email AS requester_email,
              u.department,
              a.risk_score, a.recommendation, a.reasoning, a.flags
         FROM purchase_requests pr
         JOIN users u ON u.id = pr.requester_id
         LEFT JOIN ai_assessments a ON a.request_id = pr.id
        WHERE pr.org_id = $1
          AND pr.status = 'pending_approval'
        ORDER BY pr.created_at ASC`,
      [req.user.org_id]
    );

    res.json({ queue: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/approvals/:requestId/approve ────────────────────────────────────
router.post(
  '/:requestId/approve',
  requireAtLeast('manager'),
  validate(schemas.approvalDecision),
  async (req, res, next) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { comments } = req.body;

      // Lock the request row
      const requestResult = await client.query(
        `SELECT pr.*, b.total_amount AS budget_total, b.id AS budget_row_id
           FROM purchase_requests pr
           LEFT JOIN budgets b ON b.id = pr.budget_id
          WHERE pr.id = $1 AND pr.org_id = $2 AND pr.status = 'pending_approval'
          FOR UPDATE OF pr`,
        [req.params.requestId, req.user.org_id]
      );

      if (!requestResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Request not found or not in pending approval state.' });
      }

      const purchaseRequest = requestResult.rows[0];

      // Self-approval guard
      if (purchaseRequest.requester_id === req.user.id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ message: 'You cannot approve your own request.' });
      }

      // Update request status
      await client.query(
        `UPDATE purchase_requests SET status = 'approved', updated_at = NOW() WHERE id = $1`,
        [req.params.requestId]
      );

      // Record approval
      const approvalResult = await client.query(
        `INSERT INTO approval_records (request_id, approver_id, decision, comments)
         VALUES ($1, $2, 'approved', $3) RETURNING *`,
        [req.params.requestId, req.user.id, comments || null]
      );

      await client.query('COMMIT');

      await auditService.log({
        actorId: req.user.id,
        orgId: req.user.org_id,
        action: 'approve_request',
        entityType: 'purchase_request',
        entityId: req.params.requestId,
        afterState: { decision: 'approved', comments },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({
        message: 'Request approved.',
        approval: approvalResult.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

// ── POST /api/approvals/:requestId/reject ─────────────────────────────────────
router.post(
  '/:requestId/reject',
  requireAtLeast('manager'),
  validate(schemas.approvalDecision),
  async (req, res, next) => {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const { comments } = req.body;

      const requestResult = await client.query(
        `SELECT * FROM purchase_requests
          WHERE id = $1 AND org_id = $2 AND status = 'pending_approval'
          FOR UPDATE`,
        [req.params.requestId, req.user.org_id]
      );

      if (!requestResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Request not found or not in pending approval state.' });
      }

      await client.query(
        `UPDATE purchase_requests
            SET status = 'rejected',
                rejection_reason = $1,
                updated_at = NOW()
          WHERE id = $2`,
        [comments || 'Rejected by manager.', req.params.requestId]
      );

      const approvalResult = await client.query(
        `INSERT INTO approval_records (request_id, approver_id, decision, comments)
         VALUES ($1, $2, 'rejected', $3) RETURNING *`,
        [req.params.requestId, req.user.id, comments || null]
      );

      await client.query('COMMIT');

      await auditService.log({
        actorId: req.user.id,
        orgId: req.user.org_id,
        action: 'reject_request',
        entityType: 'purchase_request',
        entityId: req.params.requestId,
        afterState: { decision: 'rejected', comments },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({
        message: 'Request rejected.',
        approval: approvalResult.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      next(err);
    } finally {
      client.release();
    }
  }
);

module.exports = router;

