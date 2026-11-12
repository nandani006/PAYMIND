const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireAtLeast } = require('../middleware/rbac');
const { auditService } = require('../services/auditService');

const router = express.Router();

router.use(authenticate);

// ── GET /api/audit ────────────────────────────────────────────────────────────
router.get('/', requireAtLeast('manager'), async (req, res, next) => {
  try {
    const { entity_type, entity_id, actor_id, limit = 50, offset = 0 } = req.query;

    const { rows, total } = await auditService.list({
      orgId: req.user.org_id,
      entityType: entity_type,
      entityId: entity_id,
      actorId: actor_id,
      limit: Math.min(parseInt(limit, 10) || 50, 200),
      offset: parseInt(offset, 10) || 0,
    });

    res.json({ logs: rows, total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/audit/entity/:type/:id ──────────────────────────────────────────
router.get('/entity/:type/:id', requireAtLeast('manager'), async (req, res, next) => {
  try {
    const { rows, total } = await auditService.list({
      orgId: req.user.org_id,
      entityType: req.params.type,
      entityId: req.params.id,
    });

    res.json({ logs: rows, total });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

