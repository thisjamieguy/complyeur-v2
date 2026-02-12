import { ZodError } from 'zod'

/**
 * Centralized error handling for ComplyEur
 *
 * Key principles:
 * - Never expose raw database errors to users
 * - Provide actionable error messages
 * - Map technical errors to user-friendly messages
 */

// Application error codes
export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'OVERLAP_DETECTED'
  | 'DUPLICATE_ENTRY'
  | 'SESSION_EXPIRED'
  | 'UNKNOWN_ERROR'

// Structured error for the application
export interface AppError {
  code: AppErrorCode
  message: string
  field?: string
  details?: Record<string, string>
}

// Error classes (re-exported from existing lib/errors.ts for compatibility)
export class ApplicationError extends Error {
  constructor(
    message: string,
    public readonly code: AppErrorCode = 'UNKNOWN_ERROR',
    public readonly statusCode: number = 500,
    public readonly field?: string
  ) {
    super(message)
    this.name = 'ApplicationError'
  }
}

export class AuthError extends ApplicationError {
  constructor(message: string, code: AppErrorCode = 'AUTH_ERROR') {
    super(message, code, 401)
    this.name = 'AuthError'
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, field)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

export class PermissionError extends ApplicationError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(message, 'PERMISSION_DENIED', 403)
    this.name = 'PermissionError'
  }
}

export class NetworkError extends ApplicationError {
  constructor(message: string = 'Network error. Please check your connection and try again.') {
    super(message, 'NETWORK_ERROR', 0)
    this.name = 'NetworkError'
  }
}

export class RateLimitError extends ApplicationError {
  constructor(message: string = 'Too many requests. Please wait a moment and try again.') {
    super(message, 'RATE_LIMITED', 429)
    this.name = 'RateLimitError'
  }
}

// User-friendly error messages mapped to codes
const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  VALIDATION_ERROR: 'Please check your input and try again.',
  AUTH_ERROR: 'Authentication failed. Please sign in again.',
  NOT_FOUND: 'The requested item could not be found.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  OVERLAP_DETECTED: 'This trip overlaps with an existing trip.',
  DUPLICATE_ENTRY: 'This record already exists.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
}

/**
 * Get user-friendly message for an error code
 */
export function getErrorMessage(code: AppErrorCode): string {
  return ERROR_MESSAGES[code]
}

/**
 * Parse Supabase database errors into AppError
 */
export function parseSupabaseError(error: {
  message: string
  code?: string
  details?: string
}): AppError {
  const { message, code, details } = error

  // PostgreSQL error codes
  // https://www.postgresql.org/docs/current/errcodes-appendix.html
  switch (code) {
    case '23505': // unique_violation
      return {
        code: 'DUPLICATE_ENTRY',
        message: 'This record already exists.',
        details: details ? { info: details } : undefined,
      }

    case '23503': // foreign_key_violation
      return {
        code: 'VALIDATION_ERROR',
        message: 'This operation references data that does not exist.',
      }

    case '23514': // check_violation
      return {
        code: 'VALIDATION_ERROR',
        message: 'The data provided does not meet the required constraints.',
      }

    case '42501': // insufficient_privilege (RLS violation)
      return {
        code: 'PERMISSION_DENIED',
        message: 'You do not have permission to perform this action.',
      }

    case '42P01': // undefined_table
    case 'PGRST116': // Row not found
      return {
        code: 'NOT_FOUND',
        message: 'The requested resource could not be found.',
      }

    case '53300': // too_many_connections
    case '53400': // configuration_limit_exceeded
      return {
        code: 'RATE_LIMITED',
        message: 'Service is temporarily overloaded. Please try again shortly.',
      }

    case '57014': // query_canceled (timeout)
      return {
        code: 'NETWORK_ERROR',
        message: 'The request timed out. Please try again.',
      }

    default:
      // Log the actual error for debugging
      console.error('[SupabaseError]', { message, code, details })

      // Check message content for common patterns
      if (message.includes('JWT') || message.includes('token')) {
        return {
          code: 'SESSION_EXPIRED',
          message: 'Your session has expired. Please sign in again.',
        }
      }

      if (message.includes('rate limit') || message.includes('too many')) {
        return {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait a moment and try again.',
        }
      }

      if (message.includes('network') || message.includes('fetch')) {
        return {
          code: 'NETWORK_ERROR',
          message: 'Network error. Please check your connection and try again.',
        }
      }

      return {
        code: 'UNKNOWN_ERROR',
        message: 'A database error occurred. Please try again.',
      }
  }
}

/**
 * Parse Zod validation errors into field-level messages
 */
export function parseZodError(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {}

  for (const issue of error.issues) {
    const path = issue.path.join('.')
    // Only keep the first error for each field
    if (!fieldErrors[path]) {
      fieldErrors[path] = issue.message
    }
  }

  return fieldErrors
}

/**
 * Get the first error message from a Zod error
 */
export function getFirstZodError(error: ZodError): string {
  if (error.issues.length > 0) {
    return error.issues[0].message
  }
  return 'Validation failed'
}

/**
 * Parse any error into a user-friendly AppError
 */
export function parseError(error: unknown): AppError {
  // Already an AppError structure
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error
  ) {
    return error as AppError
  }

  // Zod validation error
  if (error instanceof ZodError) {
    return {
      code: 'VALIDATION_ERROR',
      message: getFirstZodError(error),
      details: parseZodError(error),
    }
  }

  // Application error classes
  if (error instanceof ApplicationError) {
    return {
      code: error.code,
      message: error.message,
      field: error.field,
    }
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection and try again.',
      }
    }

    // Don't expose raw error messages in production
    console.error('[UnexpectedError]', error)
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Something went wrong. Please try again.',
    }
  }

  // Unknown error type
  console.error('[UnknownError]', error)
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred. Please try again.',
  }
}

/**
 * Type guard to check if an error has a specific code
 */
export function isErrorCode(error: AppError, code: AppErrorCode): boolean {
  return error.code === code
}

/**
 * Check if an error is retryable (network errors, rate limits, etc.)
 */
export function isRetryableError(error: AppError): boolean {
  return ['NETWORK_ERROR', 'RATE_LIMITED', 'UNKNOWN_ERROR'].includes(error.code)
}

/**
 * Structured result type for server actions
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: AppError }

/**
 * Create a successful action result
 */
export function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

/**
 * Create a failed action result
 */
export function failure(error: AppError): ActionResult<never> {
  return { success: false, error }
}

/**
 * Wrap an async function to return ActionResult instead of throwing
 */
export async function safeAction<T>(
  fn: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    return success(data)
  } catch (error) {
    return failure(parseError(error))
  }
}
