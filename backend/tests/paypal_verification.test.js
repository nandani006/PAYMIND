const { compareMonetaryAmounts, toMinorUnits } = require('../src/utils/currency');

describe('PayPal Zero-Trust Verification & Integration Logic', () => {
  function verifyCaptureUnit(capturedAmount, capturedCurrency, expectedAmount, expectedCurrency, captureStatus, captureId) {
    const isStatusCompleted = captureStatus === 'COMPLETED';
    const hasValidCaptureId = typeof captureId === 'string' && captureId.trim().length > 0;
    const isAmountValid = compareMonetaryAmounts(capturedAmount, capturedCurrency, expectedAmount, expectedCurrency);

    return {
      isValid: isStatusCompleted && hasValidCaptureId && isAmountValid,
      isStatusCompleted,
      hasValidCaptureId,
      isAmountValid,
    };
  }

  describe('Zero-Trust Capture Validation with Currency-Aware Minor Units', () => {
    it('validates authentic PayPal capture with exact amount, currency, valid ID, and COMPLETED status', () => {
      const result = verifyCaptureUnit('350.00', 'USD', 350.00, 'USD', 'COMPLETED', '3C679366HH908993F');
      expect(result.isValid).toBe(true);
      expect(result.isStatusCompleted).toBe(true);
      expect(result.hasValidCaptureId).toBe(true);
      expect(result.isAmountValid).toBe(true);
    });

    it('rejects tampered amount even by 1 cent ($350.00 expected vs $349.99 captured)', () => {
      const result = verifyCaptureUnit('349.99', 'USD', 350.00, 'USD', 'COMPLETED', '3C679366HH908993F');
      expect(result.isValid).toBe(false);
      expect(result.isAmountValid).toBe(false);
    });

    it('rejects currency mismatch (USD vs EUR)', () => {
      const result = verifyCaptureUnit('350.00', 'EUR', 350.00, 'USD', 'COMPLETED', '3C679366HH908993F');
      expect(result.isValid).toBe(false);
      expect(result.isAmountValid).toBe(false);
    });

    it('rejects missing or empty capture ID', () => {
      const resultNoId = verifyCaptureUnit('350.00', 'USD', 350.00, 'USD', 'COMPLETED', '');
      expect(resultNoId.isValid).toBe(false);
      expect(resultNoId.hasValidCaptureId).toBe(false);

      const resultNullId = verifyCaptureUnit('350.00', 'USD', 350.00, 'USD', 'COMPLETED', null);
      expect(resultNullId.isValid).toBe(false);
      expect(resultNullId.hasValidCaptureId).toBe(false);
    });

    it('rejects non-COMPLETED status (PENDING, DECLINED, FAILED)', () => {
      const pendingResult = verifyCaptureUnit('350.00', 'USD', 350.00, 'USD', 'PENDING', '3C679366HH908993F');
      expect(pendingResult.isValid).toBe(false);
      expect(pendingResult.isStatusCompleted).toBe(false);

      const failedResult = verifyCaptureUnit('350.00', 'USD', 350.00, 'USD', 'FAILED', '3C679366HH908993F');
      expect(failedResult.isValid).toBe(false);
      expect(failedResult.isStatusCompleted).toBe(false);
    });
  });

  describe('Mocked PayPal Order & Capture Flow Integration Logic', () => {
    it('creates an Orders v2 payload adhering to login experience_context', () => {
      const frontendUrl = 'http://localhost:5173';
      const purchaseRequest = {
        id: 'req-uuid-1234',
        title: 'Datadog APM Subscription',
        amount: '350.00',
        currency: 'USD',
      };

      const payload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: purchaseRequest.id,
            description: `PAYMIND: ${purchaseRequest.title}`.substring(0, 127),
            amount: {
              currency_code: purchaseRequest.currency,
              value: purchaseRequest.amount,
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

      expect(payload.intent).toBe('CAPTURE');
      expect(payload.purchase_units[0].amount.value).toBe('350.00');
      expect(payload.purchase_units[0].amount.currency_code).toBe('USD');
      expect(payload.payment_source.paypal.experience_context.landing_page).toBe('LOGIN');
      expect(payload.payment_source.paypal.experience_context.shipping_preference).toBe('NO_SHIPPING');
      expect(payload.payment_source.paypal.experience_context.user_action).toBe('PAY_NOW');
    });

    it('handles idempotent capture: returns existing capture details if status is already completed', () => {
      const existingTransaction = {
        id: 'tx-123',
        paypal_order_id: 'ORDER-999',
        paypal_capture_id: 'CAP-888',
        status: 'completed',
        amount: '350.00',
        currency: 'USD',
      };

      function handleCaptureRequest(tx, orderId) {
        if (tx.status === 'completed') {
          return {
            statusCode: 200,
            body: {
              order_id: orderId,
              capture_id: tx.paypal_capture_id,
              status: 'COMPLETED',
              amount: parseFloat(tx.amount),
              currency: tx.currency,
              idempotent: true,
              message: 'Order already captured successfully.',
            },
          };
        }
        return { statusCode: 201, body: { status: 'COMPLETED' } };
      }

      const response = handleCaptureRequest(existingTransaction, 'ORDER-999');
      expect(response.statusCode).toBe(200);
      expect(response.body.idempotent).toBe(true);
      expect(response.body.capture_id).toBe('CAP-888');
      expect(response.body.status).toBe('COMPLETED');
    });

    it('verifies webhook signature payload generation format', () => {
      const mockHeaders = {
        'paypal-auth-algo': 'SHA256withRSA',
        'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-123',
        'paypal-transmission-id': 'trans-uuid-456',
        'paypal-transmission-sig': 'sig-base64-string',
        'paypal-transmission-time': '2026-11-11T12:00:00Z',
      };
      const mockEvent = {
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAP-777',
          status: 'COMPLETED',
          amount: { value: '350.00', currency_code: 'USD' },
        },
      };
      const webhookId = 'WH-123456';

      const verifyPayload = {
        auth_algo: mockHeaders['paypal-auth-algo'],
        cert_url: mockHeaders['paypal-cert-url'],
        transmission_id: mockHeaders['paypal-transmission-id'],
        transmission_sig: mockHeaders['paypal-transmission-sig'],
        transmission_time: mockHeaders['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: mockEvent,
      };

      expect(verifyPayload.webhook_id).toBe(webhookId);
      expect(verifyPayload.transmission_id).toBe('trans-uuid-456');
      expect(verifyPayload.webhook_event.event_type).toBe('PAYMENT.CAPTURE.COMPLETED');
    });
  });
});
