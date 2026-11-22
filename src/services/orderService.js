'use strict';

const { getTraceId, ValidationError } = require('errtrace');
const { PaymentFailedError } = require('../errors/customErrors');

/**
 * Simulates a multi-step checkout workflow in an e-commerce platform.
 * Demonstrates how getTraceId() retrieves the trace ID deep within services
 * without passing the HTTP req object down.
 */
async function processCheckout(orderData = {}) {
  const traceId = getTraceId();
  const logs = [];

  logs.push({ step: '1_validate_cart', traceId, timestamp: new Date().toISOString() });

  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    throw new ValidationError('Checkout validation failed: Cart cannot be empty', {
      required: ['items'],
      received: orderData
    });
  }

  // Simulate inventory reservation delay
  await new Promise((resolve) => setTimeout(resolve, 15));
  logs.push({ step: '2_reserve_inventory', traceId, timestamp: new Date().toISOString() });

  // Simulate payment processing
  await new Promise((resolve) => setTimeout(resolve, 15));

  // If card ends with 0002 or amount < 0, fail with custom PaymentFailedError
  if (orderData.cardNumber && orderData.cardNumber.endsWith('0002')) {
    throw new PaymentFailedError('Card declined by issuing bank', {
      gateway: 'StripeMock',
      declinedCode: 'insufficient_funds',
      orderAmount: orderData.amount || 99.99,
      traceContext: traceId
    });
  }

  logs.push({ step: '3_payment_cleared', traceId, timestamp: new Date().toISOString() });

  return {
    success: true,
    orderId: `ord_${Date.now().toString(36)}`,
    traceId,
    workflowLogs: logs
  };
}

/**
 * Runs a simulated multi-stage async pipeline where each stage queries getTraceId().
 * Useful for instructors to inspect AsyncLocalStorage fidelity across timers and microtasks.
 */
async function runAsyncTraceAudit() {
  const steps = [];

  async function stepA() {
    await new Promise((resolve) => setImmediate(resolve));
    return { step: 'A_Authentication_Context', activeTrace: getTraceId() };
  }

  async function stepB() {
    await new Promise((resolve) => setTimeout(resolve, 5));
    return { step: 'B_Database_Query_Pool', activeTrace: getTraceId() };
  }

  async function stepC() {
    await Promise.resolve();
    return { step: 'C_Message_Queue_Publish', activeTrace: getTraceId() };
  }

  steps.push(await stepA());
  steps.push(await stepB());
  steps.push(await stepC());

  return {
    asyncStoragePreserved: steps.every((s) => s.activeTrace === steps[0].activeTrace && s.activeTrace !== null),
    traceId: getTraceId(),
    stages: steps
  };
}

module.exports = {
  processCheckout,
  runAsyncTraceAudit
};
