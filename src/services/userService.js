'use strict';

const {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  getTraceId
} = require('errtrace');

// In-memory mock database
const usersDb = new Map([
  ['usr_101', { id: 'usr_101', username: 'alice', email: 'alice@example.com', role: 'admin' }],
  ['usr_102', { id: 'usr_102', username: 'bob', email: 'bob@example.com', role: 'member' }]
]);

/**
 * Simulates finding a user by ID.
 * Throws NotFoundError if not present.
 */
async function getUserById(id) {
  const currentTrace = getTraceId();
  // Simulate async database I/O
  await new Promise((resolve) => setTimeout(resolve, 10));

  const user = usersDb.get(id);
  if (!user) {
    throw new NotFoundError(`User with ID "${id}" was not found`, {
      searchedId: id,
      availableIds: Array.from(usersDb.keys()),
      traceContext: currentTrace
    });
  }

  return { ...user, resolvedInTrace: currentTrace };
}

/**
 * Simulates validating and registering a new user.
 * Validates payload and throws ValidationError with structured issues.
 */
async function createUser(payload = {}) {
  const currentTrace = getTraceId();
  const issues = [];

  if (!payload.username || typeof payload.username !== 'string' || payload.username.trim().length < 3) {
    issues.push({
      field: 'username',
      issue: 'Username is required and must be at least 3 characters long',
      received: payload.username ?? null
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!payload.email || !emailRegex.test(payload.email)) {
    issues.push({
      field: 'email',
      issue: 'Invalid email address format (e.g. user@example.com)',
      received: payload.email ?? null
    });
  }

  if (payload.role && !['admin', 'member', 'guest'].includes(payload.role)) {
    issues.push({
      field: 'role',
      issue: 'Role must be one of: "admin", "member", "guest"',
      received: payload.role
    });
  }

  if (issues.length > 0) {
    throw new ValidationError('User validation failed', issues);
  }

  // Check for conflicts
  for (const [, existing] of usersDb) {
    if (existing.email.toLowerCase() === payload.email.toLowerCase()) {
      throw new ConflictError(`A user with email "${payload.email}" already exists`, {
        conflictField: 'email',
        conflictingValue: payload.email
      });
    }
  }

  const newId = `usr_${Date.now().toString(36)}`;
  const newUser = {
    id: newId,
    username: payload.username.trim(),
    email: payload.email.trim().toLowerCase(),
    role: payload.role || 'member'
  };

  usersDb.set(newId, newUser);
  return { ...newUser, createdInTrace: currentTrace };
}

/**
 * Simulates checking authentication and authorization.
 */
function verifyAuth(authHeader, requiredRole = 'admin') {
  const currentTrace = getTraceId();

  if (!authHeader) {
    throw new UnauthorizedError('Authentication credentials were not provided in Authorization header', {
      headerRequired: 'Authorization: Bearer <token>',
      traceContext: currentTrace
    });
  }

  if (authHeader === 'Bearer member-token' && requiredRole === 'admin') {
    throw new ForbiddenError('Access denied: requires administrator role privileges', {
      userRole: 'member',
      requiredRole: 'admin',
      traceContext: currentTrace
    });
  }

  if (authHeader !== 'Bearer admin-token' && authHeader !== 'Bearer member-token') {
    throw new UnauthorizedError('Invalid or expired authentication token', {
      traceContext: currentTrace
    });
  }

  return {
    authenticated: true,
    role: authHeader === 'Bearer admin-token' ? 'admin' : 'member',
    traceId: currentTrace
  };
}

module.exports = {
  getUserById,
  createUser,
  verifyAuth,
  usersDb
};
