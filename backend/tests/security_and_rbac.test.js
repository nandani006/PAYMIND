const bcrypt = require('bcrypt');
const { requireRole, requireAtLeast } = require('../src/middleware/rbac');
const { generateKey } = require('../src/utils/idempotency');

describe('Security & RBAC Unit Test Suite', () => {
  describe('Password Hashing Security', () => {
    it('properly hashes and verifies passwords using bcrypt', async () => {
      const password = 'StrongPassword123!';
      const hash = await bcrypt.hash(password, 12);

      expect(hash).not.toEqual(password);
      expect(hash.startsWith('$2b$12$') || hash.startsWith('$2a$12$')).toBe(true);

      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('RBAC Middleware Enforcement', () => {
    it('requireRole allows permitted role', () => {
      const req = { user: { role: 'org_admin' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      const middleware = requireRole('org_admin', 'super_admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('requireRole rejects unpermitted role with 403', () => {
      const req = { user: { role: 'employee' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      const middleware = requireRole('org_admin', 'super_admin');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Insufficient permissions.' }));
    });

    it('requireAtLeast permits higher level roles', () => {
      const req = { user: { role: 'org_admin' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      const middleware = requireAtLeast('manager');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('requireAtLeast rejects lower level roles with 403', () => {
      const req = { user: { role: 'employee' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      const middleware = requireAtLeast('manager');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('rejects unauthenticated requests with 401', () => {
      const req = {}; // no req.user
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      const middleware = requireAtLeast('employee');
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Idempotency Key Generation', () => {
    it('generates consistent SHA-256 idempotency hash for identical inputs', () => {
      const key1 = generateKey('paypal_order', 'req-1234', 'org-5678');
      const key2 = generateKey('paypal_order', 'req-1234', 'org-5678');
      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64); // SHA-256 hex digest length
    });

    it('generates distinct hash for different parameters', () => {
      const key1 = generateKey('paypal_order', 'req-1234', 'org-5678');
      const key2 = generateKey('paypal_order', 'req-9999', 'org-5678');
      expect(key1).not.toBe(key2);
    });
  });
});

