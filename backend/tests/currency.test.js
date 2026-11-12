const {
  getCurrencyDecimals,
  toMinorUnits,
  formatFromMinorUnits,
  compareMonetaryAmounts,
} = require('../src/utils/currency');

describe('Currency & Monetary Utility (Minor Units Precision)', () => {
  describe('getCurrencyDecimals', () => {
    it('returns 2 for standard fiat currencies (USD, EUR, GBP, CAD, AUD)', () => {
      expect(getCurrencyDecimals('USD')).toBe(2);
      expect(getCurrencyDecimals('usd')).toBe(2);
      expect(getCurrencyDecimals('EUR')).toBe(2);
      expect(getCurrencyDecimals('GBP')).toBe(2);
      expect(getCurrencyDecimals('CAD')).toBe(2);
      expect(getCurrencyDecimals('AUD')).toBe(2);
    });

    it('returns 0 for zero-decimal currencies (JPY, KRW, VND)', () => {
      expect(getCurrencyDecimals('JPY')).toBe(0);
      expect(getCurrencyDecimals('krw')).toBe(0);
      expect(getCurrencyDecimals('VND')).toBe(0);
    });

    it('returns 3 for three-decimal currencies (KWD, BHD, OMR)', () => {
      expect(getCurrencyDecimals('KWD')).toBe(3);
      expect(getCurrencyDecimals('BHD')).toBe(3);
      expect(getCurrencyDecimals('omr')).toBe(3);
    });

    it('defaults to 2 for null, undefined, or unknown currencies', () => {
      expect(getCurrencyDecimals(null)).toBe(2);
      expect(getCurrencyDecimals(undefined)).toBe(2);
      expect(getCurrencyDecimals('')).toBe(2);
    });
  });

  describe('toMinorUnits', () => {
    it('converts USD amounts to exact integer cents', () => {
      expect(toMinorUnits(350.00, 'USD')).toBe(35000);
      expect(toMinorUnits('350.00', 'USD')).toBe(35000);
      expect(toMinorUnits('19.99', 'USD')).toBe(1999);
      expect(toMinorUnits(0.01, 'USD')).toBe(1);
    });

    it('prevents floating-point drift (e.g. 0.1 + 0.2 cents representation)', () => {
      const sum = 0.1 + 0.2; // 0.30000000000000004
      expect(toMinorUnits(sum, 'USD')).toBe(30);
    });

    it('converts zero-decimal JPY correctly without multiplying by 100', () => {
      expect(toMinorUnits(500, 'JPY')).toBe(500);
      expect(toMinorUnits('12500', 'JPY')).toBe(12500);
    });

    it('converts three-decimal KWD correctly multiplying by 1000', () => {
      expect(toMinorUnits('1.250', 'KWD')).toBe(1250);
      expect(toMinorUnits(2.5, 'KWD')).toBe(2500);
    });

    it('returns NaN for invalid monetary values', () => {
      expect(isNaN(toMinorUnits('invalid', 'USD'))).toBe(true);
      expect(isNaN(toMinorUnits(null, 'USD'))).toBe(true);
      expect(isNaN(toMinorUnits(undefined, 'USD'))).toBe(true);
    });
  });

  describe('formatFromMinorUnits', () => {
    it('formats minor units to two-decimal strings for USD', () => {
      expect(formatFromMinorUnits(35000, 'USD')).toBe('350.00');
      expect(formatFromMinorUnits(1999, 'USD')).toBe('19.99');
      expect(formatFromMinorUnits(50, 'USD')).toBe('0.50');
    });

    it('formats minor units to integer strings for JPY', () => {
      expect(formatFromMinorUnits(500, 'JPY')).toBe('500');
      expect(formatFromMinorUnits(12500, 'JPY')).toBe('12500');
    });

    it('formats minor units to three-decimal strings for KWD', () => {
      expect(formatFromMinorUnits(1250, 'KWD')).toBe('1.250');
    });
  });

  describe('compareMonetaryAmounts', () => {
    it('returns true when amounts and currencies match exactly', () => {
      expect(compareMonetaryAmounts(350, 'USD', '350.00', 'usd')).toBe(true);
      expect(compareMonetaryAmounts('12500', 'JPY', 12500, 'JPY')).toBe(true);
    });

    it('returns false when amounts differ even by 1 cent', () => {
      expect(compareMonetaryAmounts('350.00', 'USD', '350.01', 'USD')).toBe(false);
      expect(compareMonetaryAmounts(100.00, 'USD', 99.99, 'USD')).toBe(false);
    });

    it('returns false when currencies differ even if amount is equal', () => {
      expect(compareMonetaryAmounts(350, 'USD', 350, 'EUR')).toBe(false);
      expect(compareMonetaryAmounts(100, 'USD', 100, 'CAD')).toBe(false);
    });

    it('returns false on invalid or missing inputs', () => {
      expect(compareMonetaryAmounts('invalid', 'USD', 100, 'USD')).toBe(false);
      expect(compareMonetaryAmounts(100, null, 100, 'USD')).toBe(false);
      expect(compareMonetaryAmounts(100, 'USD', 100, '')).toBe(false);
    });
  });
});

