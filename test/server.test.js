'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const server = require('../server');

let baseUrl = '';

before(async () => {
  await new Promise((resolve) => {
    // Listen on random available port for tests
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

/**
 * Helper to make HTTP requests in tests
 */
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          // non-JSON response (e.g. HTML dashboard)
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: json,
          rawBody: data
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.setHeader('Content-Type', 'application/json');
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }

    req.end();
  });
}

describe('errtrace Evaluation Server Tests', () => {
  test('GET / serves the interactive HTML evaluation dashboard', async () => {
    const res = await request('/');
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.ok(res.rawBody.includes('errtrace'));
    assert.ok(res.rawBody.includes('Interactive Error Scenarios'));
    assert.ok(res.headers['x-trace-id'], 'Must include x-trace-id header');
  });

  test('GET /health returns 200 and active trace ID', async () => {
    const res = await request('/health');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'healthy');
    assert.ok(res.body.traceId, 'Response body must contain active traceId');
    assert.equal(res.body.traceId, res.headers['x-trace-id']);
  });

  test('Preserves incoming x-trace-id header in response and error payload', async () => {
    const customTrace = 'instructor-eval-trace-4242';
    const res = await request('/api/users/usr_9999', {
      headers: { 'x-trace-id': customTrace }
    });

    assert.equal(res.statusCode, 404);
    assert.equal(res.headers['x-trace-id'], customTrace);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.traceId, customTrace);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  test('Respects incoming x-request-id alternative trace header', async () => {
    const customReqId = 'req-trace-uuid-7777';
    const res = await request('/health', {
      headers: { 'x-request-id': customReqId }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['x-trace-id'], customReqId);
    assert.equal(res.body.traceId, customReqId);
  });

  test('POST /api/users throws 422 ValidationError with structured field issues', async () => {
    const res = await request('/api/users', {
      method: 'POST',
      body: { username: 'a', email: 'invalid-email-address' }
    });

    assert.equal(res.statusCode, 422);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.equal(res.body.error.statusCode, 422);
    assert.ok(Array.isArray(res.body.error.details), 'details should be an array of field errors');
    assert.equal(res.body.error.details.length, 2);
    assert.ok(res.body.error.details.some((d) => d.field === 'username'));
    assert.ok(res.body.error.details.some((d) => d.field === 'email'));
  });

  test('GET /api/secure/profile throws 401 UnauthorizedError when auth missing', async () => {
    const res = await request('/api/secure/profile');
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  test('GET /api/secure/admin throws 403 ForbiddenError when role insufficient', async () => {
    const res = await request('/api/secure/admin', {
      headers: { Authorization: 'Bearer member-token' }
    });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  test('POST /api/orders/checkout throws custom 402 PaymentFailedError (AppError subclass)', async () => {
    const res = await request('/api/orders/checkout', {
      method: 'POST',
      body: {
        items: ['laptop_1'],
        cardNumber: '4242424242420002',
        amount: 1200
      }
    });

    assert.equal(res.statusCode, 402);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'PAYMENT_FAILED');
    assert.equal(res.body.error.statusCode, 402);
    assert.ok(res.body.error.details.declinedCode, 'Should include custom details');
  });

  test('GET /api/direct-error demonstrates direct sendError helper', async () => {
    const res = await request('/api/direct-error');
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'BAD_REQUEST');
  });

  test('GET /api/async-trace-audit proves AsyncLocalStorage context retention across stages', async () => {
    const res = await request('/api/async-trace-audit');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.audit.asyncStoragePreserved, true);
    assert.equal(res.body.audit.stages.length, 3);
    // Every stage in the async pipeline observed the exact same trace ID
    const stageTraces = res.body.audit.stages.map((s) => s.activeTrace);
    assert.equal(new Set(stageTraces).size, 1);
  });

  test('GET /api/unhandled-crash captures raw Error into 500 INTERNAL_SERVER_ERROR', async () => {
    const res = await request('/api/unhandled-crash');
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INTERNAL_SERVER_ERROR');
    assert.ok(Array.isArray(res.body.error.stack), 'Stack trace attached in development mode');
  });

  test('GET /api/compare-dev-prod shows dev vs prod masking behavior', async () => {
    const res = await request('/api/compare-dev-prod');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.developmentMode.payload.error.stack, 'Dev mode includes stack');
    assert.equal(res.body.productionMode.payload.error.stack, undefined, 'Prod mode hides stack');
    assert.equal(res.body.productionMode.payload.error.message, 'An internal server error occurred');
  });

  test('Default 404 for unknown endpoints returns structured NotFoundError', async () => {
    const res = await request('/non-existent-route-xyz');
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});
