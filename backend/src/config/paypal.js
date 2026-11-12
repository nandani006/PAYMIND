const axios = require('axios');

const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com';

let cachedToken = null;
let tokenExpiresAt = null;

/**
 * Fetch a PayPal OAuth2 access token (cached until expiry).
 */
async function getAccessToken() {
  if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await axios.post(
    `${PAYPAL_BASE_URL}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  cachedToken = response.data.access_token;
  // expire 60 seconds before actual expiry
  tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;

  return cachedToken;
}

/**
 * Make an authenticated PayPal API call.
 */
async function paypalRequest(method, path, data = null, idempotencyKey = null) {
  const token = await getAccessToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  if (idempotencyKey) {
    headers['PayPal-Request-Id'] = idempotencyKey;
  }

  try {
    const response = await axios({
      method,
      url: `${PAYPAL_BASE_URL}${path}`,
      data,
      headers,
    });

    return response.data;
  } catch (err) {
    if (err.response?.data) {
      const pData = err.response.data;
      const details = Array.isArray(pData.details)
        ? pData.details.map(d => `${d.issue || ''}: ${d.description || ''}`.trim()).filter(Boolean).join('; ')
        : '';
      const msg = details ? `${pData.message || 'PayPal Error'}: ${details}` : (pData.message || err.message);
      const enhancedError = new Error(msg);
      enhancedError.status = err.response.status;
      enhancedError.response = err.response;
      enhancedError.isAxiosError = true;
      throw enhancedError;
    }
    throw err;
  }
}

module.exports = { getAccessToken, paypalRequest, PAYPAL_BASE_URL };
