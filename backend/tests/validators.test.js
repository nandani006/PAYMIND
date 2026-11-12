const { schemas } = require('../src/utils/validators');

describe('Validators Unit Test Suite', () => {
  describe('createRequest Schema', () => {
    it('accepts valid purchase request payload', () => {
      const payload = {
        title: 'JetBrains All Products Pack',
        vendor: 'JetBrains s.r.o.',
        category: 'Software & SaaS',
        amount: 499.00,
        currency: 'USD',
        justification: 'IDE licenses for engineering team',
      };
      const { error, value } = schemas.createRequest.validate(payload);
      expect(error).toBeUndefined();
      expect(value.amount).toBe(499);
      expect(value.currency).toBe('USD');
    });

    it('rejects negative amount', () => {
      const payload = {
        title: 'Negative Amount Request',
        vendor: 'Vendor Inc',
        category: 'Software & SaaS',
        amount: -50.00,
      };
      const { error } = schemas.createRequest.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('amount');
    });

    it('rejects missing title or vendor', () => {
      const payload = {
        amount: 100.00,
        category: 'Software & SaaS',
      };
      const { error } = schemas.createRequest.validate(payload);
      expect(error).toBeDefined();
    });
  });

  describe('createPolicy Schema', () => {
    it('accepts valid spending policy payload', () => {
      const payload = {
        name: 'Standard Department Policy',
        single_purchase_limit: 2500,
        requires_approval_above: 500,
        auto_approve_below: 100,
        allowed_categories: ['Software & SaaS', 'Office Supplies'],
        blocked_vendors: ['FraudCorp'],
      };
      const { error } = schemas.createPolicy.validate(payload);
      expect(error).toBeUndefined();
    });

    it('rejects non-positive single_purchase_limit', () => {
      const payload = {
        name: 'Invalid Policy',
        single_purchase_limit: 0,
        requires_approval_above: 0,
      };
      const { error } = schemas.createPolicy.validate(payload);
      expect(error).toBeDefined();
    });
  });

  describe('createBudget Schema', () => {
    it('rejects invalid period dates where end <= start', () => {
      const payload = {
        total_amount: 10000,
        period_start: new Date('2026-06-01').toISOString(),
        period_end: new Date('2026-05-01').toISOString(), // end before start
      };
      const { error } = schemas.createBudget.validate(payload);
      expect(error).toBeDefined();
    });

    it('accepts valid budget period', () => {
      const payload = {
        department: 'Engineering',
        total_amount: 50000,
        currency: 'USD',
        period: 'monthly',
        period_start: new Date('2026-01-01').toISOString(),
        period_end: new Date('2026-01-31').toISOString(),
      };
      const { error } = schemas.createBudget.validate(payload);
      expect(error).toBeUndefined();
    });
  });

  describe('login Schema', () => {
    it('rejects invalid email format', () => {
      const payload = { email: 'not-an-email', password: 'password123' };
      const { error } = schemas.login.validate(payload);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('email');
    });

    it('normalizes email to lowercase', () => {
      const payload = { email: 'User@DEMOCORP.COM', password: 'password123' };
      const { error, value } = schemas.login.validate(payload);
      expect(error).toBeUndefined();
      expect(value.email).toBe('user@democorp.com');
    });
  });
});

