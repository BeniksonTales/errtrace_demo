'use strict';

class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} [statusCode=500]
   * @param {string} [code='INTERNAL_SERVER_ERROR']
   * @param {any} [details=null]
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details = null) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation Failed', details = null) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details = null) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details = null) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource Not Found', details = null) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

class MethodNotAllowedError extends AppError {
  constructor(message = 'Method Not Allowed', details = null) {
    super(message, 405, 'METHOD_NOT_ALLOWED', details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict', details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Too Many Requests', details = null) {
    super(message, 429, 'TOO_MANY_REQUESTS', details);
  }
}

class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error', details = null) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  MethodNotAllowedError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError
};
