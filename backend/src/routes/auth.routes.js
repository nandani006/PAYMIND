const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../config/db');
const { authenticate, issueToken, clearToken } = require('../middleware/auth');
const { schemas, validate } = require('../utils/validators');
const { auditService } = require('../services/auditService');

const router = express.Router();

// ── GET /api/auth/csrf-token ──────────────────────────────────────────────────
// Returns a fresh CSRF token. Called by the frontend on mount and after login.
router.get('/csrf-token', (req, res) => {
  const token = res.locals.generateCsrfToken();
  res.json({ csrfToken: token });
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', validate(schemas.register), async (req, res, next) => {
  try {
    const { full_name, email, password, org_name, org_domain } = req.body;

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create org and admin user in a transaction
    const client = await require('../config/db').getClient();
    try {
      await client.query('BEGIN');

      const orgResult = await client.query(
        `INSERT INTO organisations (name, domain) VALUES ($1, $2) RETURNING id`,
        [org_name, org_domain || null]
      );
      const orgId = orgResult.rows[0].id;

      const userResult = await client.query(
        `INSERT INTO users (org_id, full_name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'org_admin') RETURNING id, org_id, email, full_name, role`,
        [orgId, full_name, email, passwordHash]
      );
      const user = userResult.rows[0];

      await client.query('COMMIT');

      issueToken(res, user.id);

      await auditService.log({
        actorId: user.id,
        orgId: user.org_id,
        action: 'register',
        entityType: 'user',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.status(201).json({
        message: 'Registration successful.',
        user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, org_id: user.org_id },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', validate(schemas.login), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      `SELECT id, org_id, email, full_name, role, password_hash, is_active
         FROM users WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    issueToken(res, user.id);

    await auditService.log({
      actorId: user.id,
      orgId: user.org_id,
      action: 'login',
      entityType: 'user',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      message: 'Login successful.',
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, org_id: user.org_id },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    // Blocklist the current token
    const { v4: uuidv4 } = require('uuid');
    const jti = req.tokenJti;
    if (jti) {
      await query(
        `INSERT INTO token_blocklist (token_jti, expires_at) VALUES ($1, NOW() + INTERVAL '2 hours')`,
        [jti]
      );
    }

    await auditService.log({
      actorId: req.user.id,
      orgId: req.user.org_id,
      action: 'logout',
      entityType: 'user',
      entityId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    clearToken(res);
    return res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.org_id, u.email, u.full_name, u.role, u.department,
              o.name AS org_name
         FROM users u
         JOIN organisations o ON o.id = u.org_id
        WHERE u.id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

