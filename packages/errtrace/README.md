# errtrace

Zero-dependency, pure Node.js endpoint package and middleware for converting backend errors into structured, developer-friendly responses with trace IDs.

## Features

- **Pure Node.js**: Zero external dependencies. Uses only built-in Node.js modules (`node:crypto`, `node:http`, `node:async_hooks`).
- **Trace IDs**: Automatically extracts incoming trace headers (`x-trace-id`, `x-request-id`, etc.) or generates UUID v4 trace IDs.
- **Async Context Tracing**: Built on `AsyncLocalStorage` so trace IDs can be accessed anywhere in your application stack without passing `req` down through service layers.
- **Developer-Friendly Output**: Consistent, structured JSON responses with status codes, error codes, timestamps, request metadata, validation details, and stack traces (in development).
- **Production Safe**: Automatically sanitizes unhandled server errors and hides stack traces in `NODE_ENV=production`.
- **Framework Agnostic**: Works natively with pure `http.createServer` as well as Express, Connect, and any `(err, req, res, next)` middleware framework.
- **TypeScript Support**: Full TypeScript declarations included out of the box.

---

## Response Structure

```json
{
  "success": false,
  "error": {
    "traceId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "code": "VALIDATION_ERROR",
    "message": "User validation failed",
    "statusCode": 422,
    "timestamp": "2026-11-22T08:30:00.000Z",
    "method": "POST",
    "path": "/api/users",
    "details": [
      { "field": "email", "issue": "Invalid email address format" }
    ],
    "stack": [
      "ValidationError: User validation failed",
      "at Object.handle (/app/server.js:24:11)"
    ]
  }
}
```

---

## Quick Start (Pure Node.js)

```javascript
const http = require('node:http');
const {
  createErrorHandler,
  createTraceMiddleware,
  NotFoundError,
  ValidationError,
  getTraceId
} = require('errtrace');

const traceMiddleware = createTraceMiddleware();
const errorHandler = createErrorHandler();

const server = http.createServer((req, res) => {
  traceMiddleware(req, res, () => {
    try {
      if (req.url === '/api/user') {
        throw new ValidationError('Validation error', {
          missing: ['username', 'email']
        });
      }

      if (req.url === '/api/not-found') {
        throw new NotFoundError('User profile not found');
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'ok', traceId: getTraceId() }));
    } catch (err) {
      errorHandler(err, req, res);
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

---

## Direct Response Helper (`sendError`)

You can also send structured errors directly without creating a middleware instance:

```javascript
const http = require('node:http');
const { sendError, BadRequestError } = require('errtrace');

const server = http.createServer((req, res) => {
  if (req.url === '/bad') {
    return sendError(res, new BadRequestError('Invalid query parameter'), { req });
  }

  res.end('Hello World');
});

server.listen(3000);
```

---

## Built-in Semantic Error Classes

| Class | Status Code | Default Code |
| :--- | :--- | :--- |
| `BadRequestError` | `400` | `BAD_REQUEST` |
| `UnauthorizedError` | `401` | `UNAUTHORIZED` |
| `ForbiddenError` | `403` | `FORBIDDEN` |
| `NotFoundError` | `404` | `NOT_FOUND` |
| `MethodNotAllowedError` | `405` | `METHOD_NOT_ALLOWED` |
| `ConflictError` | `409` | `CONFLICT` |
| `ValidationError` | `422` | `VALIDATION_ERROR` |
| `TooManyRequestsError` | `429` | `TOO_MANY_REQUESTS` |
| `InternalServerError` | `500` | `INTERNAL_SERVER_ERROR` |

### Custom Errors

Extend `AppError` to define domain-specific errors:

```javascript
const { AppError } = require('errtrace');

class PaymentFailedError extends AppError {
  constructor(reason, details = null) {
    super(`Payment failed: ${reason}`, 402, 'PAYMENT_FAILED', details);
  }
}
```

---

## Async Context Tracing

Retrieve the active trace ID anywhere in your service or database layer without passing the request object around:

```javascript
const { getTraceId } = require('errtrace');

async function processOrder(orderId) {
  const currentTrace = getTraceId();
  console.log(`[Trace: ${currentTrace}] Processing order #${orderId}`);
  // ... database calls, external APIs, etc.
}
```

---

## API Reference

### `createErrorHandler(options)`
Creates an error-handling middleware `(err, req, res, next)`.

- `options.headerName` *(string, default: `'x-trace-id'`)*: Response header for trace ID.
- `options.includeStack` *(boolean, default: `process.env.NODE_ENV !== 'production'`)*: Include stack trace.
- `options.includeDetails` *(boolean, default: `true`)*: Include `error.details`.
- `options.includeRequestInfo` *(boolean, default: `true`)*: Include `path` and `method`.
- `options.logger` *(function `(payload, err) => void`)*: Custom logger callback.
- `options.onError` *(function `(err, req, res, traceId) => void`)*: Hook called on each error.

### `createTraceMiddleware(options)`
Creates a request-level middleware that assigns `req.traceId`, sets the response header, and wraps downstream handlers inside an `AsyncLocalStorage` context.

### `formatError(err, context)`
Pure formatter function that transforms any error into the structured response object.

---

## Testing

Run tests with Node's native test runner:

```bash
npm test
```

## License

MIT
