const { query } = require('../config/db');

/**
 * Audit service — writes immutable audit log entries.
 * Called by the requestLogger middleware and directly from route handlers.
 */
const auditService = {
  /**
   * Log an auditable action.
   * @param {object} opts
   * @param {string} opts.actorId        - UUID of the user performing the action
   * @param {string} opts.orgId          - UUID of the organisation
   * @param {string} opts.action         - Verb describing the action (e.g. 'create_request')
   * @param {string} opts.entityType     - Table/resource type (e.g. 'purchase_request')
   * @param {string|null} opts.entityId  - UUID of the affected record
   * @param {object|null} opts.beforeState - Snapshot before change (optional)
   * @param {object|null} opts.afterState  - Snapshot after change (optional)
   * @param {string|null} opts.ipAddress
   * @param {string|null} opts.userAgent
   */
  async log({
    actorId,
    orgId,
    action,
    entityType,
    entityId = null,
    beforeState = null,
    afterState = null,
    ipAddress = null,
    userAgent = null,
  }) {
    try {
      await query(
        `INSERT INTO audit_logs
           (actor_id, org_id, action, entity_type, entity_id,
            before_state, after_state, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          actorId,
          orgId,
          action,
          entityType,
          entityId,
          beforeState ? JSON.stringify(beforeState) : null,
          afterState  ? JSON.stringify(afterState)  : null,
          ipAddress,
          userAgent ? userAgent.substring(0, 500) : null,
        ]
      );
    } catch (err) {
      // Audit failures must never crash the main request
      console.error('[AuditService] Failed to write audit log:', err.message);
    }
  },

  /**
   * Retrieve paginated audit log entries for an org.
   */
  async list({ orgId, entityType, entityId, actorId, limit = 50, offset = 0 }) {
    const conditions = ['a.org_id = $1'];
    const params = [orgId];
    let idx = 2;

    if (entityType) { conditions.push(`a.entity_type = $${idx++}`); params.push(entityType); }
    if (entityId)   { conditions.push(`a.entity_id   = $${idx++}`); params.push(entityId); }
    if (actorId)    { conditions.push(`a.actor_id    = $${idx++}`); params.push(actorId); }

    const where = conditions.join(' AND ');

    const result = await query(
      `SELECT a.*, u.full_name AS actor_name, u.email AS actor_email
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.actor_id
        WHERE ${where}
        ORDER BY a.created_at DESC
        LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM audit_logs a WHERE ${where}`,
      params
    );

    return {
      rows: result.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  },
};

module.exports = { auditService };

