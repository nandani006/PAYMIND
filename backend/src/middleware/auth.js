const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing.');
  }
  return secret;
}

/**
 * Verify JWT from HttpOnly cookie. Attach user to req.user.
 */
async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.paymind_token;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Session expired. Please log in again.' });
      }
      return res.status(401).json({ message: 'Invalid token.' });
    }

    // Check token blocklist
    const blocklisted = await query(
      'SELECT id FROM token_blocklist WHERE token_jti = $1 AND expires_at > NOW()',
      [decoded.jti]
    );
    if (blocklisted.rows.length > 0) {
      return res.status(401).json({ message: 'Token has been revoked.' });
    }

    // Fetch current user
    const result = await query(
      'SELECT id, org_id, email, full_name, role, is_active FROM users WHERE id = $1',
      [decoded.sub]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ message: 'User not found or deactivated.' });
    }

    req.user = result.rows[0];
    req.tokenJti = decoded.jti;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Generate a signed JWT and set it as an HttpOnly cookie.
 */
function issueToken(res, userId) {
  const { v4: uuidv4 } = require('uuid');
  const jti = uuidv4();

  const token = jwt.sign(
    { sub: userId, jti },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  res.cookie('paymind_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // 1 hour
    path: '/',
  });

  return { jti, token };
}

function clearToken(res) {
  res.clearCookie('paymind_token', { path: '/' });
}

module.exports = { authenticate, issueToken, clearToken };
