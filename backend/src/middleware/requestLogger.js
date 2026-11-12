const { auditService } = require('../services/auditService');

/**
 * Middleware to write an audit log entry for state-changing requests.
 * Attach to specific routes as needed.
 */
function auditLog(action, entityType, getEntityId) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode < 400 && req.user) {
        try {
          const entityId = getEntityId ? getEntityId(req, body) : null;
          await auditService.log({
            actorId: req.user.id,
            orgId: req.user.org_id,
            action,
            entityType,
            entityId,
            afterState: body,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          });
        } catch (err) {
          console.error('[Audit] Failed to write audit log:', err.message);
        }
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { auditLog };
