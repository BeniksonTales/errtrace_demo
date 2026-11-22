'use strict';

const {
  BadRequestError,
  MethodNotAllowedError,
  TooManyRequestsError,
  ConflictError,
  InternalServerError,
  sendError,
  formatError,
  getTraceId
} = require('errtrace');

const { getUserById, createUser, verifyAuth } = require('../services/userService');
const { processCheckout, runAsyncTraceAudit } = require('../services/orderService');

/**
 * Safely parses JSON request body for pure Node.js HTTP server.
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Prevent payload flood (1MB limit)
      if (body.length > 1e6) {
        reject(new BadRequestError('Payload too large: maximum request body size is 1MB'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        return resolve({});
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new BadRequestError('Malformed JSON payload', { parsingError: err.message }));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

/**
 * Catalog of test scenarios for automated inspection or UI listing.
 */
const ENDPOINT_CATALOG = [
  {
    name: 'Health Check',
    method: 'GET',
    path: '/health',
    expectedStatus: 200,
    expectedCode: 'OK',
    description: 'Verifies server is healthy and reports active trace ID from AsyncLocalStorage.'
  },
  {
    name: 'Validation Error (422)',
    method: 'POST',
    path: '/api/users',
    expectedStatus: 422,
    expectedCode: 'VALIDATION_ERROR',
    description: 'Throws ValidationError with structured field issues when required fields are missing.'
  },
  {
    name: 'Not Found Error (404)',
    method: 'GET',
    path: '/api/users/usr_9999',
    expectedStatus: 404,
    expectedCode: 'NOT_FOUND',
    description: 'Throws NotFoundError when requested entity ID is not found in database.'
  },
  {
    name: 'Unauthorized Error (401)',
    method: 'GET',
    path: '/api/secure/profile',
    expectedStatus: 401,
    expectedCode: 'UNAUTHORIZED',
    description: 'Throws UnauthorizedError when Authorization header is missing or invalid.'
  },
  {
    name: 'Forbidden Error (403)',
    method: 'GET',
    path: '/api/secure/admin',
    expectedStatus: 403,
    expectedCode: 'FORBIDDEN',
    description: 'Throws ForbiddenError when authenticated user lacks admin role privileges.'
  },
  {
    name: 'Custom Domain Error (402 PaymentFailedError)',
    method: 'POST',
    path: '/api/orders/checkout',
    expectedStatus: 402,
    expectedCode: 'PAYMENT_FAILED',
    description: 'Demonstrates domain-specific subclass of AppError with custom status 402.'
  },
  {
    name: 'Conflict Error (409)',
    method: 'POST',
    path: '/api/conflict-test',
    expectedStatus: 409,
    expectedCode: 'CONFLICT',
    description: 'Throws ConflictError when resource uniquely collides with existing record.'
  },
  {
    name: 'Too Many Requests (429)',
    method: 'POST',
    path: '/api/rate-limit-test',
    expectedStatus: 429,
    expectedCode: 'TOO_MANY_REQUESTS',
    description: 'Throws TooManyRequestsError with retry-after metadata.'
  },
  {
    name: 'Method Not Allowed (405)',
    method: 'PUT',
    path: '/api/read-only-resource',
    expectedStatus: 405,
    expectedCode: 'METHOD_NOT_ALLOWED',
    description: 'Throws MethodNotAllowedError when HTTP verb is not supported.'
  },
  {
    name: 'Direct Helper sendError()',
    method: 'GET',
    path: '/api/direct-error',
    expectedStatus: 400,
    expectedCode: 'BAD_REQUEST',
    description: 'Sends structured error directly using sendError(res, err, { req }) helper without throwing.'
  },
  {
    name: 'Async Context Tracing',
    method: 'GET',
    path: '/api/async-trace-audit',
    expectedStatus: 200,
    expectedCode: 'OK',
    description: 'Audits trace ID propagation across 3 asynchronous microtask & timer boundaries using getTraceId().'
  },
  {
    name: 'Unhandled Crash (500)',
    method: 'GET',
    path: '/api/unhandled-crash',
    expectedStatus: 500,
    expectedCode: 'INTERNAL_SERVER_ERROR',
    description: 'Throws raw Error to test unhandled error capture, stack trace attachment, and production masking.'
  },
  {
    name: 'Dev vs Prod Comparison',
    method: 'GET',
    path: '/api/compare-dev-prod',
    expectedStatus: 200,
    expectedCode: 'OK',
    description: 'Compares development response (with stack) vs simulated production response (stack stripped & sanitized).'
  }
];

/**
 * Handles all API routes.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
async function handleApiRoute(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // 1. Health check
  if (pathname === '/health' && method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({
      status: 'healthy',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      traceId: getTraceId(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    }));
  }

  // 2. Catalog of endpoints
  if (pathname === '/api/catalog' && method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({
      count: ENDPOINT_CATALOG.length,
      traceId: getTraceId(),
      endpoints: ENDPOINT_CATALOG
    }));
  }

  // 3. User Validation Error (422) or Success (201)
  if (pathname === '/api/users' && method === 'POST') {
    const body = await parseJsonBody(req);
    const result = await createUser(body);
    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ success: true, data: result }));
  }

  // 4. User Not Found (404) or Found (200)
  if (pathname.startsWith('/api/users/') && method === 'GET') {
    const userId = pathname.replace('/api/users/', '');
    const user = await getUserById(userId);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ success: true, data: user }));
  }

  // 5. Authentication Test (401 / 403 / 200)
  if (pathname === '/api/secure/profile' && method === 'GET') {
    const authHeader = req.headers.authorization;
    const authResult = verifyAuth(authHeader, 'member');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ success: true, user: authResult }));
  }

  if (pathname === '/api/secure/admin' && method === 'GET') {
    const authHeader = req.headers.authorization;
    const authResult = verifyAuth(authHeader, 'admin');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ success: true, adminSecret: 'SUPER_SECRET_KEY_9876', auth: authResult }));
  }

  // 6. Custom Domain Error: PaymentFailedError (402)
  if (pathname === '/api/orders/checkout' && method === 'POST') {
    const body = await parseJsonBody(req);
    const orderResult = await processCheckout(body);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify(orderResult));
  }

  // 7. Conflict Error (409)
  if (pathname === '/api/conflict-test' && method === 'POST') {
    throw new ConflictError('A record with unique key "license_2026_x" already exists', {
      conflictingKey: 'license_2026_x',
      existingRecordId: 'lic_882910'
    });
  }

  // 8. Too Many Requests (429)
  if (pathname === '/api/rate-limit-test' && method === 'POST') {
    throw new TooManyRequestsError('Rate limit exceeded: quota is 60 requests per minute', {
      retryAfterSeconds: 45,
      currentTier: 'free'
    });
  }

  // 9. Method Not Allowed (405)
  if (pathname === '/api/read-only-resource') {
    if (method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ success: true, message: 'Read-only resource accessed' }));
    }
    throw new MethodNotAllowedError(`HTTP method ${method} is not supported for this resource`, {
      supportedMethods: ['GET']
    });
  }

  // 10. Direct Helper sendError() (400)
  if (pathname === '/api/direct-error' && method === 'GET') {
    const filterParam = parsedUrl.searchParams.get('filter');
    if (!filterParam || !['active', 'archived'].includes(filterParam)) {
      return sendError(
        res,
        new BadRequestError('Missing or invalid "filter" query parameter', {
          received: filterParam,
          expectedOneOf: ['active', 'archived'],
          example: '/api/direct-error?filter=active'
        }),
        { req }
      );
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ success: true, filter: filterParam, traceId: getTraceId() }));
  }

  // 11. Async Context Tracing Audit
  if (pathname === '/api/async-trace-audit' && method === 'GET') {
    const auditResult = await runAsyncTraceAudit();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({
      success: true,
      message: 'AsyncLocalStorage context cleanly propagated across async microtasks & timers',
      audit: auditResult
    }));
  }

  // 12. Unhandled Crash (500)
  if (pathname === '/api/unhandled-crash' && method === 'GET') {
    throw new Error('Database cluster connection timed out after 30000ms');
  }

  // 13. Comparison Endpoint (Dev vs Prod preview)
  if (pathname === '/api/compare-dev-prod' && method === 'GET') {
    const sampleCrash = new Error('Database password authentication failure (internal secret)');
    const activeTrace = getTraceId();

    const devResponse = formatError(sampleCrash, {
      req,
      traceId: activeTrace,
      includeStack: true
    });

    const prodResponse = formatError(sampleCrash, {
      req,
      traceId: activeTrace,
      includeStack: false
    });
    // In actual production, 500 unhandled errors also mask message to "An internal server error occurred"
    prodResponse.error.message = 'An internal server error occurred';

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({
      success: true,
      description: 'Side-by-side comparison of error formatting in Development vs Production',
      traceId: activeTrace,
      developmentMode: {
        mode: 'NODE_ENV !== "production"',
        payload: devResponse
      },
      productionMode: {
        mode: 'NODE_ENV === "production"',
        payload: prodResponse
      }
    }));
  }

  // If no API route matched:
  return null;
}

module.exports = {
  handleApiRoute,
  ENDPOINT_CATALOG,
  parseJsonBody
};
