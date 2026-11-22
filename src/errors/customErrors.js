'use strict';

const { AppError } = require('errtrace');

/**
 * Custom domain error for billing/payment failures.
 * HTTP 402 Payment Required.
 */
class PaymentFailedError extends AppError {
  constructor(reason, details = null) {
    super(`Payment failed: ${reason}`, 402, 'PAYMENT_FAILED', details);
  }
}

/**
 * Custom domain error for downstream third-party service or database timeouts.
 * HTTP 504 Gateway Timeout.
 */
class DatabaseTimeoutError extends AppError {
  constructor(operation, details = null) {
    super(`Database timeout during ${operation}`, 504, 'DATABASE_TIMEOUT', details);
  }
}

module.exports = {
  PaymentFailedError,
  DatabaseTimeoutError
};
