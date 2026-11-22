'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const {
  sendError,
  createErrorHandler,
  createTraceMiddleware,
  formatError,
  generateTraceId,
  resolveTraceId,
  runWithTraceId,
  getTraceId,
  AppError,
  BadRequestError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError
} = require('../index');

test('generateTraceId produces a valid UUID v4 format', () => {
  const traceId = generateTraceId();
  assert.equal(typeof traceId, 'string');
  assert.match(traceId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
});

test('resolveTraceId resolves trace IDs correctly', () => {
  // From req.traceId property
  assert.equal(resolveTraceId({ traceId: 'prop-trace-123' }), 'prop-trace-123');

  // From x-trace-id header
  assert.equal(resolveTraceId({ headers: { 'x-trace-id': 'header-trace-456' } }), 'header-trace-456');

  // From alternative header x-request-id
  assert.equal(resolveTraceId({ headers: { 'x-request-id': 'req-id-789' } }), 'req-id-789');

  // Generated when none present
  const generated = resolveTraceId({});
  assert.match(generated, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
});

test('runWithTraceId and getTraceId propagate context across async calls', async () => {
  const traceId = 'trace-ctx-999';

  await runWithTraceId(traceId, async () => {
    assert.equal(getTraceId(), traceId);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(getTraceId(), traceId);
  });

  assert.equal(getTraceId(), null);
});

test('Error classes instantiate with appropriate status codes and properties', () => {
  const badReq = new BadRequestError('Invalid query', { field: 'age' });
  assert.equal(badReq.statusCode, 400);
  assert.equal(badReq.code, 'BAD_REQUEST');
  assert.deepEqual(badReq.details, { field: 'age' });
  assert.equal(badReq.isOperational, true);

  const notFound = new NotFoundError('User not found');
  assert.equal(notFound.statusCode, 404);
  assert.equal(notFound.code, 'NOT_FOUND');

  const validation = new ValidationError('Schema mismatch', [{ field: 'email', message: 'Required' }]);
  assert.equal(validation.statusCode, 422);
  assert.equal(validation.code, 'VALIDATION_ERROR');
  assert.equal(validation.details.length, 1);
});

test('formatError produces structured developer-friendly responses', () => {
  const err = new ValidationError('Invalid payload', { missing: ['name'] });
  const formatted = formatError(err, {
    traceId: 'tr-100',
    req: { method: 'POST', url: '/api/v1/users?ref=web' },
    includeStack: true
  });

  assert.equal(formatted.success, false);
  assert.equal(formatted.error.traceId, 'tr-100');
  assert.equal(formatted.error.code, 'VALIDATION_ERROR');
  assert.equal(formatted.error.statusCode, 422);
  assert.equal(formatted.error.message, 'Invalid payload');
  assert.equal(formatted.error.method, 'POST');
  assert.equal(formatted.error.path, '/api/v1/users');
  assert.deepEqual(formatted.error.details, { missing: ['name'] });
  assert.ok(Array.isArray(formatted.error.stack));
  assert.ok(formatted.error.timestamp);
});

test('sendError and createErrorHandler handle HTTP requests over real HTTP server', async () => {
  const errorHandler = createErrorHandler({
    includeStack: false
  });

  const server = http.createServer((req, res) => {
    if (req.url === '/not-found') {
      const err = new NotFoundError('Item does not exist');
      return errorHandler(err, req, res);
    }

    if (req.url === '/throw') {
      const err = new TypeError('Cannot read properties of undefined');
      return errorHandler(err, req, res);
    }

    res.statusCode = 200;
    res.end('OK');
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = address.port;

  try {
    // Test 404 response
    const res404 = await makeRequest(`http://127.0.0.1:${port}/not-found`);
    assert.equal(res404.status, 404);
    assert.equal(res404.headers['content-type'], 'application/json; charset=utf-8');
    assert.ok(res404.headers['x-trace-id']);
    assert.equal(res404.data.success, false);
    assert.equal(res404.data.error.code, 'NOT_FOUND');
    assert.equal(res404.data.error.message, 'Item does not exist');
    assert.equal(res404.data.error.traceId, res404.headers['x-trace-id']);

    // Test 500 response from native Error
    const res500 = await makeRequest(`http://127.0.0.1:${port}/throw`);
    assert.equal(res500.status, 500);
    assert.equal(res500.data.success, false);
    assert.equal(res500.data.error.code, 'INTERNAL_SERVER_ERROR');
    assert.equal(res500.data.error.message, 'Cannot read properties of undefined');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('createTraceMiddleware propagates incoming headers and assigns traceId', async () => {
  const traceMiddleware = createTraceMiddleware();
  const errorHandler = createErrorHandler();

  const server = http.createServer((req, res) => {
    traceMiddleware(req, res, () => {
      // In middleware callback
      const err = new BadRequestError('Something invalid');
      errorHandler(err, req, res);
    });
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    const customTrace = 'my-custom-trace-header-1234';
    const res = await makeRequest(`http://127.0.0.1:${port}/test`, {
      headers: { 'x-trace-id': customTrace }
    });

    assert.equal(res.status, 400);
    assert.equal(res.headers['x-trace-id'], customTrace);
    assert.equal(res.data.error.traceId, customTrace);
    assert.equal(res.data.error.code, 'BAD_REQUEST');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

// Helper for HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, res => {
      let body = '';
      res.on('data', chunk => {
        body += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch (_) {
          parsed = body;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}
