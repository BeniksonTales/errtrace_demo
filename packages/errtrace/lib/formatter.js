'use strict';

/**
 * Standard HTTP status code to code mapping.
 */
const STATUS_TO_CODE = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  408: 'REQUEST_TIMEOUT',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT'
};

/**
 * Formats an error into a structured, developer-friendly response object.
 *
 * @param {Error|any} err - The error object to format
 * @param {object} [context={}] - Contextual details (req, traceId, options)
 * @param {string} [context.traceId] - Explicit trace ID
 * @param {import('node:http').IncomingMessage} [context.req] - Incoming HTTP request
 * @param {boolean} [context.includeStack] - Force include stack trace (default based on NODE_ENV)
 * @param {boolean} [context.includeDetails=true] - Include error.details
 * @param {boolean} [context.includeRequestInfo=true] - Include request method and path
 * @returns {{ success: false, error: object }}
 */
function formatError(err, context = {}) {
  const isProd = process.env.NODE_ENV === 'production';
  const showStack = typeof context.includeStack === 'boolean'
    ? context.includeStack
    : !isProd;

  const errorObj = err instanceof Error ? err : new Error(String(err || 'Unknown error'));

  // Resolve status code
  let statusCode = 500;
  if (typeof errorObj.statusCode === 'number' && errorObj.statusCode >= 400 && errorObj.statusCode <= 599) {
    statusCode = errorObj.statusCode;
  } else if (typeof errorObj.status === 'number' && errorObj.status >= 400 && errorObj.status <= 599) {
    statusCode = errorObj.status;
  }

  // Resolve error code
  let code = errorObj.code;
  if (!code || typeof code !== 'string' || /^[A-Z0-9_]+$/.test(code) === false) {
    code = STATUS_TO_CODE[statusCode] || 'ERROR';
  }

  // Resolve developer-friendly message
  let message = errorObj.message || 'An unexpected error occurred';
  if (isProd && statusCode === 500 && !errorObj.isOperational) {
    // Mask sensitive unexpected server crashes in production
    message = 'An internal server error occurred';
  }

  const structuredError = {
    traceId: context.traceId || null,
    code,
    message,
    statusCode,
    timestamp: new Date().toISOString()
  };

  // Attach request path and method if available
  if (context.includeRequestInfo !== false && context.req) {
    if (context.req.method) {
      structuredError.method = context.req.method;
    }
    if (context.req.url) {
      structuredError.path = context.req.url.split('?')[0];
    }
  }

  // Attach error details if available (e.g. schema validation issues, field errors)
  if (context.includeDetails !== false && errorObj.details !== undefined && errorObj.details !== null) {
    structuredError.details = errorObj.details;
  }

  // Attach stack trace if developer mode is enabled
  if (showStack && errorObj.stack) {
    structuredError.stack = errorObj.stack
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }

  return {
    success: false,
    error: structuredError
  };
}

module.exports = {
  formatError,
  STATUS_TO_CODE
};
