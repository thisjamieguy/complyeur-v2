/**
 * Custom error classes for consistent error handling across the application
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'UNKNOWN_ERROR',
    public readonly statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class AuthError extends AppError {
  constructor(message: string, code: string = 'AUTH_ERROR') {
    super(message, code, 401)
    this.name = 'AuthError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, code, 400)
    this.name = 'ValidationError'
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, code: string = 'DATABASE_ERROR') {
    super(message, code, 500)
    this.name = 'DatabaseError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code: string = 'NOT_FOUND') {
    super(message, code, 404)
    this.name = 'NotFoundError'
  }
}

/**
 * Type for structured error responses from server actions
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: string }

/**
 * Wraps a server action to provide consistent error handling
 * Returns structured result instead of throwing
 */
export function createSafeAction<TInput, TOutput>(
  action: (input: TInput) => Promise<TOutput>
): (input: TInput) => Promise<ActionResult<TOutput>> {
  return async (input: TInput): Promise<ActionResult<TOutput>> => {
    try {
      const data = await action(input)
      return { success: true, data }
    } catch (error) {
      if (error instanceof AppError) {
        return { success: false, error: error.message, code: error.code }
      }

      // Log unexpected errors but don't expose details to client
      console.error('Unexpected error in server action:', error)
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.',
        code: 'UNKNOWN_ERROR',
      }
    }
  }
}

/**
 * Maps Supabase auth errors to user-friendly messages
 */
export function getAuthErrorMessage(supabaseError: { message: string; status?: number }): string {
  const { message } = supabaseError

  // Common Supabase auth error messages
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password'
  }
  if (message.includes('Email not confirmed')) {
    return 'Please verify your email address before signing in'
  }
  if (message.includes('User already registered')) {
    return 'An account with this email already exists'
  }
  if (message.includes('Password should be at least')) {
    return 'Password must be at least 8 characters'
  }
  if (message.includes('rate limit')) {
    return 'Too many attempts. Please try again later.'
  }
  if (message.includes('Email rate limit exceeded')) {
    return 'Too many email requests. Please try again later.'
  }
  if (message.includes('Unsupported provider') && message.includes('provider is not enabled')) {
    return 'Google sign-in is not configured yet. Enable the Google provider in Supabase Auth settings.'
  }
  // Catch Supabase rate limit messages like "For security purposes, you can only request this after X seconds"
  if (message.includes('For security purposes') && message.includes('only request this after')) {
    return 'Too many signup attempts. Please wait a moment before trying again.'
  }
  // Handle email validation errors - some Supabase instances may reject emails with + signs
  // even though they're RFC 5322 compliant
  if (message.includes('Email address') && message.includes('is invalid') && message.includes('+')) {
    return 'This email address format is not accepted. Please try using a different email address or contact support if you believe this is an error.'
  }
  if (message.includes('Email address') && message.includes('is invalid')) {
    return 'Please enter a valid email address. Some email formats may not be supported.'
  }

  // Return original message if no mapping found (safe for auth errors)
  return message
}

/**
 * Maps Supabase database errors to user-friendly messages
 */
export function getDatabaseErrorMessage(supabaseError: { message: string; code?: string }): string {
  const { message, code } = supabaseError

  // Don't expose detailed database errors
  if (code === '23505') {
    return 'This record already exists'
  }
  if (code === '23503') {
    return 'This operation references data that does not exist'
  }
  if (code === '42501') {
    return 'You do not have permission to perform this action'
  }

  // Log the actual error for debugging
  console.error('Database error:', { message, code })

  return 'A database error occurred. Please try again.'
}
