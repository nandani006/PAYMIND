const express = require('express');
const { query, getClient } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAtLeast } = require('../middleware/rbac');
const { paypalRequest } = require('../config/paypal');
const { generateKey, checkTransactionIdempotency } = require('../utils/idempotency');
const { auditService } = require('../services/auditService');
const {
  toMinorUnits,
  compareMonetaryAmounts,
  formatFromMinorUnits,
} = require('../utils/currency');

const router = express.Router();
const { paymentRateLimiter } = require('../middleware/rateLimiter');

// ── POST /api/payments/webhooks (External PayPal Webhook Callback) ─────────────
// Cryptographically verified via PayPal signature verification API (no cookie auth)
router.post('/webhooks', async (req, res) => {
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    const body = req.body;

    // Verify PayPal signature if webhookId is configured
    if (webhookId) {
      const verifyPayload = {
        auth_algo: req.headers['paypal-auth-algo'],
        cert_url: req.headers['paypal-cert-url'],
        transmission_id: req.headers['paypal-transmission-id'],
        transmission_sig: req.headers['paypal-transmission-sig'],
        transmission_time: req.headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: body,
      };

      try {
        const verification = await paypalRequest('POST', '/v1/notifications/verify-webhook-signature', verifyPayload);
        if (verification?.verification_status !== 'SUCCESS') {
          console.warn('[PayPal Webhook] Signature verification rejected by PayPal:', verification);
          return res.status(400).json({ message: 'Invalid webhook signature.' });
        }
      } catch (verifyErr) {
        console.error('[PayPal Webhook] Verification API failed:', verifyErr.message);
        return res.status(400).json({ message: 'Webhook signature verification failed.' });
      }
    }

    const eventType = body?.event_type;
    const resource = body?.resource;

    console.log(`[PayPal Webhook] Received verified event: ${eventType}`);

    // Handle payment capture completion idempotently with strict monetary verification
    if (eventType === 'PAYMENT.CAPTURE.COMPLETED' && resource) {
      const captureId = resource.id;
      const orderId = resource.supplementary_data?.related_ids?.order_id;
      const resourceAmount = resource.amount?.value;
      const resourceCurrency = resource.amount?.currency_code;

      if (orderId && captureId) {
        const client = await getClient();
        try {
          await client.query('BEGIN');
          const txRes = await client.query(
            `SELECT id, status, request_id, amount, currency FROM transactions WHERE paypal_order_id = $1 FOR UPDATE`,
            [orderId]
          );

          if (txRes.rows.length) {
            const tx = txRes.rows[0];

            if (tx.status !== 'completed') {
              // Strict currency-aware minor unit verification before state transition
              const isAmountValid = compareMonetaryAmounts(resourceAmount, resourceCurrency, tx.amount, tx.currency);

              if (isAmountValid && resource.status === 'COMPLETED') {
                await client.query(
                  `UPDATE transactions SET status = 'completed', paypal_capture_id = $1, captured_at = NOW(), updated_at = NOW() WHERE id = $2`,
                  [captureId, tx.id]
                );
                await client.query(
                  `UPDATE purchase_requests SET status = 'completed', updated_at = NOW() WHERE id = $1`,
                  [tx.request_id]
                );
                console.log(`[PayPal Webhook] Order ${orderId} successfully settled via webhook capture ${captureId}`);
              } else {
                console.warn(`[PayPal Webhook] Capture verification failed for order ${orderId}: amount/currency mismatch or non-completed status.`);
              }
            }
          }
          await client.query('COMMIT');
        } catch (dbErr) {
          await client.query('ROLLBACK');
          console.error('[PayPal Webhook DB Transaction Error]', dbErr.message);
        } finally {
          client.release();
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[PayPal Webhook Handler Error]', err.message);
    return res.status(200).json({ received: true, error: err.message });
  }
});

router.use(authenticate);
router.use(paymentRateLimiter);

// ── POST /api/payments/orders ─────────────────────────────────────────────────
// Create a PayPal order for an approved purchase request.
router.post('/orders', requireAtLeast('finance_manager'), async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { request_id } = req.body;

    if (!request_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'request_id is required.' });
    }

    // Lock and verify the purchase request
    const requestResult = await client.query(
      `SELECT * FROM purchase_requests
        WHERE id = $1 AND org_id = $2
        FOR UPDATE`,
      [request_id, req.user.org_id]
    );

    if (!requestResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        message: 'Purchase request not found.',
      });
    }

    const purchaseRequest = requestResult.rows[0];

    // Status checks
    if (purchaseRequest.status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        message: 'Purchase request has already been paid and completed.',
      });
    }

    if (!['approved', 'payment_initiated'].includes(purchaseRequest.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Cannot initiate payment: purchase request is in '${purchaseRequest.status}' state (must be 'approved').`,
      });
    }

    // Check if an active uncaptured transaction already exists for this request
    const existingTx = await client.query(
      `SELECT * FROM transactions WHERE request_id = $1 AND org_id = $2 AND status = 'created' ORDER BY created_at DESC LIMIT 1`,
      [request_id, req.user.org_id]
    );

    if (existingTx.rows.length) {
      await client.query('ROLLBACK');
      return res.status(200).json({
        message: 'Existing pending payment order reused.',
        order_id: existingTx.rows[0].paypal_order_id,
        idempotent: true,
      });
    }

    // Verify amount and currency with minor units precision
    const currency = (purchaseRequest.currency || 'USD').toUpperCase();
    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
    if (!supportedCurrencies.includes(currency)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Unsupported currency: ${currency}` });
    }

    const minorUnits = toMinorUnits(purchaseRequest.amount, currency);
    if (isNaN(minorUnits) || minorUnits <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid purchase request amount.' });
    }
    const formattedAmount = formatFromMinorUnits(minorUnits, currency);

    // Generate unique idempotency key
    const idempotencyKey = generateKey('paypal_order', request_id, req.user.org_id);

    // Create PayPal order using modern Orders v2 payment_source.paypal.experience_context with landing_page LOGIN
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: purchaseRequest.id,
          description: `PAYMIND: ${purchaseRequest.title}`.substring(0, 127),
          amount: {
            currency_code: currency,
            value: formattedAmount,
          },
          custom_id: purchaseRequest.id,
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: 'PAYMIND Enterprise',
            landing_page: 'LOGIN',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
            return_url: `${frontendUrl}/requests`,
            cancel_url: `${frontendUrl}/requests`,
          },
        },
      },
    };

    const paypalOrder = await paypalRequest('POST', '/v2/checkout/orders', orderPayload, idempotencyKey);

    // Record the transaction
    await client.query(
      `INSERT INTO transactions
         (org_id, request_id, paypal_order_id, amount, currency, status, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, 'created', $6)`,
      [
        req.user.org_id,
        request_id,
        paypalOrder.id,
        parseFloat(formattedAmount),
        currency,
        idempotencyKey,
      ]
    );

    // Update request status to payment_initiated
    await client.query(
      `UPDATE purchase_requests SET status = 'payment_initiated', updated_at = NOW() WHERE id = $1`,
      [request_id]
    );

    await client.query('COMMIT');

    await auditService.log({
      actorId: req.user.id,
      orgId: req.user.org_id,
      action: 'create_payment_order',
      entityType: 'purchase_request',
      entityId: request_id,
      afterState: { paypal_order_id: paypalOrder.id, amount: parseFloat(formattedAmount), currency },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      order_id: paypalOrder.id,
      status: paypalOrder.status,
      links: paypalOrder.links,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── POST /api/payments/orders/:orderId/capture ────────────────────────────────
router.post('/orders/:orderId/capture', requireAtLeast('finance_manager'), async (req, res, next) => {
  const { orderId } = req.params;
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Find the transaction with FOR UPDATE lock to verify ownership & state
    const txResult = await client.query(
      `SELECT t.*, pr.id AS purchase_request_id, pr.status AS request_status
         FROM transactions t
         JOIN purchase_requests pr ON pr.id = t.request_id
        WHERE t.paypal_order_id = $1 AND t.org_id = $2
        FOR UPDATE`,
      [orderId, req.user.org_id]
    );

    if (!txResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Order not found in this organization.' });
    }

    const tx = txResult.rows[0];

    // Safe Idempotency: If already completed, return 200 with captured details
    if (tx.status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(200).json({
        order_id: orderId,
        capture_id: tx.paypal_capture_id,
        status: 'COMPLETED',
        amount: parseFloat(tx.amount),
        currency: tx.currency,
        idempotent: true,
        message: 'Order already captured successfully.',
      });
    }

    // Verify transaction state
    if (tx.status !== 'created') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Cannot capture payment: transaction is in '${tx.status}' state.`,
      });
    }

    let captureResult;
    try {
      captureResult = await paypalRequest('POST', `/v2/checkout/orders/${orderId}/capture`);
    } catch (captureErr) {
      // Record failed capture attempt
      await client.query(
        `UPDATE transactions SET status = 'failed', updated_at = NOW() WHERE id = $1`,
        [tx.id]
      );
      await client.query('COMMIT');

      await auditService.log({
        actorId: req.user.id,
        orgId: req.user.org_id,
        action: 'capture_payment_failed',
        entityType: 'purchase_request',
        entityId: tx.purchase_request_id,
        afterState: { paypal_order_id: orderId, error: captureErr.message },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.status(400).json({
        message: 'PayPal capture failed: ' + (captureErr.response?.data?.message || captureErr.message),
        details: captureErr.response?.data,
      });
    }

    const captureStatus = captureResult?.status; // Must be 'COMPLETED'
    const captureUnit = captureResult?.purchase_units?.[0]?.payments?.captures?.[0];
    const captureId = captureUnit?.id;

    // Strict zero-trust verification: validate capture status, capture ID, amount, and currency
    const capturedAmount = captureUnit?.amount?.value;
    const capturedCurrency = captureUnit?.amount?.currency_code;
    const expectedAmount = tx.amount;
    const expectedCurrency = tx.currency || 'USD';

    const isStatusCompleted = captureStatus === 'COMPLETED' && captureUnit?.status === 'COMPLETED';
    const hasValidCaptureId = typeof captureId === 'string' && captureId.trim().length > 0;
    const isAmountValid = compareMonetaryAmounts(capturedAmount, capturedCurrency, expectedAmount, expectedCurrency);

    if (!isStatusCompleted || !hasValidCaptureId || !isAmountValid) {
      await client.query(
        `UPDATE transactions SET status = 'failed', paypal_capture_id = $1, updated_at = NOW() WHERE id = $2`,
        [captureId || null, tx.id]
      );
      await client.query('COMMIT');

      return res.status(400).json({
        message: 'Payment verification failed: captured amount, currency, or capture status mismatch.',
        capturedAmount,
        expectedAmount,
        capturedCurrency,
        expectedCurrency,
        captureStatus,
        captureId,
      });
    }

    // Capture verified successfully
    await client.query(
      `UPDATE transactions
          SET status = 'completed', paypal_capture_id = $1, captured_at = NOW(), updated_at = NOW()
        WHERE id = $2`,
      [captureId, tx.id]
    );

    // Update purchase request to completed
    await client.query(
      `UPDATE purchase_requests SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [tx.purchase_request_id]
    );

    await client.query('COMMIT');

    await auditService.log({
      actorId: req.user.id,
      orgId: req.user.org_id,
      action: 'capture_payment',
      entityType: 'purchase_request',
      entityId: tx.purchase_request_id,
      afterState: {
        paypal_order_id: orderId,
        capture_id: captureId,
        amount: parseFloat(expectedAmount),
        currency: expectedCurrency,
        status: 'completed',
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      order_id: orderId,
      capture_id: captureId,
      status: 'COMPLETED',
      amount: parseFloat(expectedAmount),
      currency: expectedCurrency,
      capture_result: captureResult,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ── GET /api/payments/orders/:orderId/status ──────────────────────────────────
router.get('/orders/:orderId/status', async (req, res, next) => {
  try {
    const txResult = await query(
      `SELECT t.*, pr.title, pr.amount AS request_amount, pr.vendor
         FROM transactions t
         JOIN purchase_requests pr ON pr.id = t.request_id
        WHERE t.paypal_order_id = $1 AND t.org_id = $2`,
      [req.params.orderId, req.user.org_id]
    );

    if (!txResult.rows.length) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json({ transaction: txResult.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/payments/transactions ────────────────────────────────────────────
router.get('/transactions', requireAtLeast('finance_manager'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT t.*, pr.title, pr.vendor, pr.category, u.full_name AS requester_name
         FROM transactions t
         JOIN purchase_requests pr ON pr.id = t.request_id
         JOIN users u ON u.id = pr.requester_id
        WHERE t.org_id = $1
        ORDER BY t.created_at DESC
        LIMIT 100`,
      [req.user.org_id]
    );
    res.json({ transactions: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

// ── GET /api/payments/orders/:orderId/status ──────────────────────────────────
router.get('/orders/:orderId/status', async (req, res, next) => {
  try {
    const txResult = await query(
      `SELECT t.*, pr.title, pr.amount AS request_amount, pr.vendor
         FROM transactions t
         JOIN purchase_requests pr ON pr.id = t.request_id
        WHERE t.paypal_order_id = $1 AND t.org_id = $2`,
      [req.params.orderId, req.user.org_id]
    );

    if (!txResult.rows.length) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json({ transaction: txResult.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/payments/transactions ────────────────────────────────────────────
router.get('/transactions', requireAtLeast('finance_manager'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT t.*, pr.title, pr.vendor, pr.category, u.full_name AS requester_name
         FROM transactions t
         JOIN purchase_requests pr ON pr.id = t.request_id
         JOIN users u ON u.id = pr.requester_id
        WHERE t.org_id = $1
        ORDER BY t.created_at DESC
        LIMIT 100`,
      [req.user.org_id]
    );
    res.json({ transactions: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

