'use strict';

const crypto = require('node:crypto');
const { AsyncLocalStorage } = require('node:async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

const DEFAULT_TRACE_HEADER = 'x-trace-id';
const ALTERNATE_HEADERS = ['x-request-id', 'x-correlation-id', 'traceparent'];

/**
 * Generates a standard cryptographically random UUID v4 trace identifier.
 * @returns {string}
 */
function generateTraceId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Extracts an existing trace/request ID from request headers or generates a new one.
 * @param {import('node:http').IncomingMessage|object} [req]
 * @param {string} [headerName]
 * @returns {string}
 */
function resolveTraceId(req, headerName = DEFAULT_TRACE_HEADER) {
  if (req && req.traceId) {
    return req.traceId;
  }

  const headers = req && req.headers ? req.headers : {};
  const primaryKey = headerName.toLowerCase();

  if (headers[primaryKey]) {
    const val = headers[primaryKey];
    return Array.isArray(val) ? val[0] : val;
  }

  for (const alt of ALTERNATE_HEADERS) {
    if (headers[alt]) {
      const val = headers[alt];
      return Array.isArray(val) ? val[0] : val;
    }
  }

  // Check AsyncLocalStorage store if active
  const store = asyncLocalStorage.getStore();
  if (store && store.traceId) {
    return store.traceId;
  }

  return generateTraceId();
}

/**
 * Run a callback function within an asynchronous trace context.
 * Any code executed inside callback (even across async await bounds) can query getTraceId().
 * @param {string} traceId
 * @param {() => any} callback
 * @returns {any}
 */
function runWithTraceId(traceId, callback) {
  return asyncLocalStorage.run({ traceId }, callback);
}

/**
 * Gets current trace ID from AsyncLocalStorage store or returns null.
 * @returns {string|null}
 */
function getTraceId() {
  const store = asyncLocalStorage.getStore();
  return (store && store.traceId) ? store.traceId : null;
}

module.exports = {
  DEFAULT_TRACE_HEADER,
  generateTraceId,
  resolveTraceId,
  runWithTraceId,
  getTraceId,
  asyncLocalStorage
};
