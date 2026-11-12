/**
 * PAYMIND Currency & Monetary Calculations Utility
 * Ensures currency-aware minor unit conversions and strict integer comparisons
 * to prevent floating-point representation and precision drift.
 */

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
]);

const THREE_DECIMAL_CURRENCIES = new Set([
  'BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'
]);

/**
 * Returns number of decimal places for a standard ISO 4217 currency.
 * Defaults to 2 for most fiat currencies (USD, EUR, GBP, CAD, AUD, INR, etc.)
 */
function getCurrencyDecimals(currency = 'USD') {
  if (!currency || typeof currency !== 'string') return 2;
  const upper = currency.trim().toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(upper)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(upper)) return 3;
  return 2;
}

/**
 * Converts a numeric or string monetary value to integer minor units (e.g. cents).
 * @param {number|string} amount
 * @param {string} currency
 * @returns {number} Integer minor units, or NaN if amount is invalid
 */
function toMinorUnits(amount, currency = 'USD') {
  if (amount === null || amount === undefined || amount === '') return NaN;
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount).replace(/,/g, ''));
  if (isNaN(num) || !isFinite(num)) return NaN;

  const decimals = getCurrencyDecimals(currency);
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor);
}

/**
 * Converts integer minor units back to a formatted major unit string (e.g. 35000 -> "350.00").
 * @param {number} minorUnits
 * @param {string} currency
 * @returns {string}
 */
function formatFromMinorUnits(minorUnits, currency = 'USD') {
  if (isNaN(minorUnits) || !isFinite(minorUnits)) return '0.00';
  const decimals = getCurrencyDecimals(currency);
  const factor = Math.pow(10, decimals);
  const major = minorUnits / factor;
  return major.toFixed(decimals);
}

/**
 * Compares two monetary amounts for exact currency-aware equality using integer minor units.
 * @param {number|string} amountA
 * @param {string} currencyA
 * @param {number|string} amountB
 * @param {string} currencyB
 * @returns {boolean}
 */
function compareMonetaryAmounts(amountA, currencyA, amountB, currencyB) {
  if (!currencyA || !currencyB) return false;
  const normCurrA = String(currencyA).trim().toUpperCase();
  const normCurrB = String(currencyB).trim().toUpperCase();
  if (normCurrA !== normCurrB) return false;

  const minorA = toMinorUnits(amountA, normCurrA);
  const minorB = toMinorUnits(amountB, normCurrB);

  if (isNaN(minorA) || isNaN(minorB)) return false;
  return minorA === minorB;
}

module.exports = {
  getCurrencyDecimals,
  toMinorUnits,
  formatFromMinorUnits,
  compareMonetaryAmounts,
};

