'use strict';

const { resolveTraceId, runWithTraceId, DEFAULT_TRACE_HEADER } = require('./trace');
const { formatError } = require('./formatter');

/**
 * Directly sends a structured error response over a standard Node.js ServerResponse.
 *
 * @param {import('node:http').ServerResponse} res
 * @param {Error|any} err
 * @param {object} [options={}]
 * @param {import('node:http').IncomingMessage} [options.req]
 * @param {string} [options.traceId]
 * @param {string} [options.headerName='x-trace-id']
 * @param {boolean} [options.includeStack]
 * @param {boolean} [options.includeDetails=true]
 * @param {boolean} [options.includeRequestInfo=true]
 * @param {Function} [options.logger]
 * @returns {object} The formatted error response payload
 */
function sendError(res, err, options = {}) {
  const req = options.req || res.req;
  const headerName = options.headerName || DEFAULT_TRACE_HEADER;
  const traceId = options.traceId || (req ? resolveTraceId(req, headerName) : resolveTraceId(null, headerName));

  const payload = formatError(err, {
    traceId,
    req,
    includeStack: options.includeStack,
    includeDetails: options.includeDetails,
    includeRequestInfo: options.includeRequestInfo
  });

  const statusCode = payload.error.statusCode || 500;

  if (typeof options.logger === 'function') {
    options.logger(payload, err);
  }

  // If response is already closed or headers sent, avoid crashing
  if (res.writableEnded || res.finished) {
    return payload;
  }

  if (!res.headersSent) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(headerName, traceId);
  }

  res.end(JSON.stringify(payload));
  return payload;
}

/**
 * Creates standard HTTP error-handling middleware.
 * Compatible with pure Node.js HTTP handlers, Express, Connect, and any (err, req, res, next) pattern.
 *
 * @param {object} [options={}]
 * @param {string} [options.headerName='x-trace-id']
 * @param {boolean} [options.includeStack]
 * @param {boolean} [options.includeDetails=true]
 * @param {boolean} [options.includeRequestInfo=true]
 * @param {Function} [options.logger]
 * @param {Function} [options.onError]
 * @returns {(err: any, req: any, res: any, next?: any) => object}
 */
function createErrorHandler(options = {}) {
  return function errorHandler(err, req, res, next) {
    const headerName = options.headerName || DEFAULT_TRACE_HEADER;
    const traceId = resolveTraceId(req, headerName);

    if (typeof options.onError === 'function') {
      try {
        options.onError(err, req, res, traceId);
      } catch (hookErr) {
        // Prevent hook error from breaking error response delivery
        console.error('Error in onError hook:', hookErr);
      }
    }

    const payload = sendError(res, err, {
      ...options,
      req,
      traceId,
      headerName
    });

    if (typeof next === 'function' && (res.writableEnded || res.finished)) {
      // Finished normally
      return payload;
    }

    return payload;
  };
}

/**
 * Creates trace middleware to initialize trace ID propagation early in request lifecycle.
 * Attaches req.traceId, sets the response header, and wraps downstream handlers inside AsyncLocalStorage context.
 *
 * @param {object} [options={}]
 * @param {string} [options.headerName='x-trace-id']
 * @returns {(req: any, res: any, next: (err?: any) => void) => void}
 */
function createTraceMiddleware(options = {}) {
  const headerName = options.headerName || DEFAULT_TRACE_HEADER;

  return function traceMiddleware(req, res, next) {
    const traceId = resolveTraceId(req, headerName);
    req.traceId = traceId;

    if (res && typeof res.setHeader === 'function') {
      res.setHeader(headerName, traceId);
    }

    runWithTraceId(traceId, () => {
      if (typeof next === 'function') {
        next();
      }
    });
  };
}

module.exports = {
  sendError,
  createErrorHandler,
  createTraceMiddleware
};
