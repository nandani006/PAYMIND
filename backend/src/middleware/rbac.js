const ROLE_HIERARCHY = ['employee', 'manager', 'finance_manager', 'org_admin', 'super_admin'];

/**
 * Require the user to have one of the specified roles.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }
    next();
  };
}

/**
 * Require the user to be at least at the given role level.
 */
function requireAtLeast(minRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    const userLevel = ROLE_HIERARCHY.indexOf(req.user.role);
    const minLevel = ROLE_HIERARCHY.indexOf(minRole);
    if (userLevel < minLevel) {
      return res.status(403).json({ message: 'Insufficient permissions.' });
    }
    next();
  };
}

/**
 * Require the user to belong to the same org as the resource.
 */
function requireSameOrg(getOrgId) {
  return async (req, res, next) => {
    try {
      const orgId = await getOrgId(req);
      if (req.user.org_id !== orgId && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied: different organisation.' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireRole, requireAtLeast, requireSameOrg };
