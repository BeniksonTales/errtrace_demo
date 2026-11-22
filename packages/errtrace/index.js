'use strict';

const errors = require('./lib/errors');
const trace = require('./lib/trace');
const formatter = require('./lib/formatter');
const handler = require('./lib/handler');

module.exports = {
  // Core Error Handler & Response Dispatcher
  sendError: handler.sendError,
  createErrorHandler: handler.createErrorHandler,
  createTraceMiddleware: handler.createTraceMiddleware,

  // Error Formatter
  formatError: formatter.formatError,
  STATUS_TO_CODE: formatter.STATUS_TO_CODE,

  // Trace Identification & Async Context
  generateTraceId: trace.generateTraceId,
  resolveTraceId: trace.resolveTraceId,
  runWithTraceId: trace.runWithTraceId,
  getTraceId: trace.getTraceId,
  DEFAULT_TRACE_HEADER: trace.DEFAULT_TRACE_HEADER,

  // Semantic HTTP Error Classes
  AppError: errors.AppError,
  BadRequestError: errors.BadRequestError,
  ValidationError: errors.ValidationError,
  UnauthorizedError: errors.UnauthorizedError,
  ForbiddenError: errors.ForbiddenError,
  NotFoundError: errors.NotFoundError,
  MethodNotAllowedError: errors.MethodNotAllowedError,
  ConflictError: errors.ConflictError,
  TooManyRequestsError: errors.TooManyRequestsError,
  InternalServerError: errors.InternalServerError
};
