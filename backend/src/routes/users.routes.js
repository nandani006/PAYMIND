const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireRole, requireAtLeast } = require('../middleware/rbac');
const { auditService } = require('../services/auditService');

const router = express.Router();

// All users routes require authentication
router.use(authenticate);

// ── GET /api/users ────────────────────────────────────────────────────────────
// List users in the same org. Managers+ only.
router.get('/', requireAtLeast('manager'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, email, full_name, role, department, is_active, created_at
         FROM users
        WHERE org_id = $1
        ORDER BY full_name`,
      [req.user.org_id]
    );
    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/users/:id ────────────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, org_id, email, full_name, role, department, is_active, created_at
         FROM users
        WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.org_id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/users ───────────────────────────────────────────────────────────
// Org admins can create users within their org.
router.post('/', requireRole('org_admin', 'super_admin'), async (req, res, next) => {
  try {
    const { full_name, email, role = 'employee', department, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: 'full_name, email, and password are required.' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ message: 'A user with this email already exists.' });
    }

    const allowedRoles = ['employee', 'manager', 'finance_manager', 'org_admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (org_id, full_name, email, password_hash, role, department)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, org_id, email, full_name, role, department, is_active, created_at`,
      [req.user.org_id, full_name, email, passwordHash, role, department || null]
    );

    const newUser = result.rows[0];

    await auditService.log({
      actorId: req.user.id,
      orgId: req.user.org_id,
      action: 'create_user',
      entityType: 'user',
      entityId: newUser.id,
      afterState: { email: newUser.email, role: newUser.role },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ user: newUser });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/users/:id ──────────────────────────────────────────────────────
router.patch('/:id', requireRole('org_admin', 'super_admin'), async (req, res, next) => {
  try {
    const existing = await query(
      'SELECT * FROM users WHERE id = $1 AND org_id = $2',
      [req.params.id, req.user.org_id]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { full_name, role, department, is_active } = req.body;
    const current = existing.rows[0];

    // Privilege escalation protection
    if (role) {
      const validRoles = ['employee', 'manager', 'finance_manager', 'org_admin', 'super_admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified.' });
      }
      if (req.params.id === req.user.id && role !== current.role) {
        return res.status(403).json({ message: 'You cannot modify your own administrative role.' });
      }
      if (role === 'super_admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Only super_admin can assign the super_admin role.' });
      }
    }

    const result = await query(
      `UPDATE users SET
         full_name  = COALESCE($1, full_name),
         role       = COALESCE($2, role),
         department = COALESCE($3, department),
         is_active  = COALESCE($4, is_active),
         updated_at = NOW()
       WHERE id = $5 AND org_id = $6
       RETURNING id, org_id, email, full_name, role, department, is_active, updated_at`,
      [full_name, role, department, is_active, req.params.id, req.user.org_id]
    );

    await auditService.log({
      actorId: req.user.id,
      orgId: req.user.org_id,
      action: 'update_user',
      entityType: 'user',
      entityId: req.params.id,
      beforeState: { role: current.role, is_active: current.is_active },
      afterState: { role: result.rows[0].role, is_active: result.rows[0].is_active },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
// Soft-delete: set is_active = false
router.delete('/:id', requireRole('org_admin', 'super_admin'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' });
    }

    const result = await query(
      `UPDATE users SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND org_id = $2
       RETURNING id`,
      [req.params.id, req.user.org_id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await auditService.log({
      actorId: req.user.id,
      orgId: req.user.org_id,
      action: 'deactivate_user',
      entityType: 'user',
      entityId: req.params.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'User deactivated.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

