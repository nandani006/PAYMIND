const crypto = require('crypto');
const { query } = require('../config/db');

/**
 * Generate an idempotency key from input parts.
 */
function generateKey(...parts) {
  return crypto.createHash('sha256').update(parts.join('::')).digest('hex');
}

/**
 * Check if a transaction with this idempotency key already exists.
 * Returns the existing transaction or null.
 */
async function checkTransactionIdempotency(idempotencyKey) {
  const result = await query(
    'SELECT * FROM transactions WHERE idempotency_key = $1',
    [idempotencyKey]
  );
  return result.rows[0] || null;
}

module.exports = { generateKey, checkTransactionIdempotency };
