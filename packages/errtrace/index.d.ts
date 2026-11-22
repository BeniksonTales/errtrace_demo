import type { IncomingMessage, ServerResponse } from 'node:http';

export interface StructuredErrorPayload {
  success: false;
  error: {
    traceId: string | null;
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    method?: string;
    path?: string;
    details?: any;
    stack?: string[];
  };
}

export interface ErrorFormatOptions {
  traceId?: string;
  req?: IncomingMessage | { method?: string; url?: string; headers?: Record<string, string | string[]> };
  includeStack?: boolean;
  includeDetails?: boolean;
  includeRequestInfo?: boolean;
}

export interface SendErrorOptions extends ErrorFormatOptions {
  headerName?: string;
  logger?: (payload: StructuredErrorPayload, originalError: any) => void;
}

export interface ErrorHandlerOptions extends SendErrorOptions {
  onError?: (err: any, req: IncomingMessage, res: ServerResponse, traceId: string) => void;
}

export interface TraceMiddlewareOptions {
  headerName?: string;
}

export class AppError extends Error {
  statusCode: number;
  code: string;
  details: any;
  isOperational: boolean;

  constructor(message: string, statusCode?: number, code?: string, details?: any);
}

export class BadRequestError extends AppError {
  constructor(message?: string, details?: any);
}

export class ValidationError extends AppError {
  constructor(message?: string, details?: any);
}

export class UnauthorizedError extends AppError {
  constructor(message?: string, details?: any);
}

export class ForbiddenError extends AppError {
  constructor(message?: string, details?: any);
}

export class NotFoundError extends AppError {
  constructor(message?: string, details?: any);
}

export class MethodNotAllowedError extends AppError {
  constructor(message?: string, details?: any);
}

export class ConflictError extends AppError {
  constructor(message?: string, details?: any);
}

export class TooManyRequestsError extends AppError {
  constructor(message?: string, details?: any);
}

export class InternalServerError extends AppError {
  constructor(message?: string, details?: any);
}

export const DEFAULT_TRACE_HEADER: string;

export function generateTraceId(): string;
export function resolveTraceId(req?: IncomingMessage | object, headerName?: string): string;
export function runWithTraceId<T>(traceId: string, callback: () => T): T;
export function getTraceId(): string | null;

export function formatError(err: any, context?: ErrorFormatOptions): StructuredErrorPayload;
export const STATUS_TO_CODE: Record<number, string>;

export function sendError(
  res: ServerResponse,
  err: any,
  options?: SendErrorOptions
): StructuredErrorPayload;

export function createErrorHandler(
  options?: ErrorHandlerOptions
): (err: any, req: IncomingMessage, res: ServerResponse, next?: (err?: any) => void) => StructuredErrorPayload;

export function createTraceMiddleware(
  options?: TraceMiddlewareOptions
): (req: IncomingMessage, res: ServerResponse, next: (err?: any) => void) => void;
