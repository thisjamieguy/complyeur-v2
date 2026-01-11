import { toast } from 'sonner'

/**
 * Toast helper functions for consistent user feedback
 *
 * Duration defaults:
 * - Success: 3 seconds (auto-dismiss)
 * - Warning: 4 seconds
 * - Error: 5 seconds (longer for user to read)
 * - Loading: indefinite (must be dismissed programmatically)
 */

/**
 * Show a success toast (green)
 * Auto-dismisses after 3 seconds
 */
export function showSuccess(message: string, description?: string) {
  toast.success(message, {
    description,
    duration: 3000,
  })
}

/**
 * Show an error toast (red)
 * Auto-dismisses after 5 seconds to give user time to read
 */
export function showError(message: string, description?: string) {
  toast.error(message, {
    description,
    duration: 5000,
  })
}

/**
 * Show a warning toast (amber)
 * Auto-dismisses after 4 seconds
 */
export function showWarning(message: string, description?: string) {
  toast.warning(message, {
    description,
    duration: 4000,
  })
}

/**
 * Show an info toast
 * Auto-dismisses after 3 seconds
 */
export function showInfo(message: string, description?: string) {
  toast.info(message, {
    description,
    duration: 3000,
  })
}

/**
 * Show a loading toast for async operations
 * Returns a function to dismiss the toast
 *
 * @example
 * const dismiss = showLoading('Saving...')
 * try {
 *   await saveData()
 *   dismiss()
 *   showSuccess('Saved!')
 * } catch (error) {
 *   dismiss()
 *   showError('Failed to save')
 * }
 */
export function showLoading(message: string): () => void {
  const toastId = toast.loading(message, {
    duration: Infinity, // Don't auto-dismiss
  })

  return () => {
    toast.dismiss(toastId)
  }
}

/**
 * Show a promise toast that updates based on promise state
 * Useful for async operations where you want automatic success/error handling
 *
 * @example
 * showPromise(
 *   saveData(),
 *   {
 *     loading: 'Saving...',
 *     success: 'Saved successfully!',
 *     error: 'Failed to save'
 *   }
 * )
 */
export function showPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: unknown) => string)
  }
): Promise<T> {
  toast.promise(promise, messages)
  return promise
}

/**
 * Dismiss a specific toast by ID
 */
export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId)
}

/**
 * Dismiss all active toasts
 */
export function dismissAllToasts() {
  toast.dismiss()
}

/**
 * Show a toast with an action button
 *
 * @example
 * showWithAction(
 *   'Trip deleted',
 *   'Undo',
 *   () => restoreTrip(tripId)
 * )
 */
export function showWithAction(
  message: string,
  actionLabel: string,
  onAction: () => void,
  options?: {
    description?: string
    duration?: number
  }
) {
  toast(message, {
    description: options?.description,
    duration: options?.duration ?? 5000,
    action: {
      label: actionLabel,
      onClick: onAction,
    },
  })
}

/**
 * Common toast patterns for the application
 */
export const toasts = {
  // Trip operations
  tripAdded: () => showSuccess('Trip added successfully'),
  tripUpdated: () => showSuccess('Trip updated successfully'),
  tripDeleted: () => showSuccess('Trip deleted'),
  tripOverlap: (dates: string) =>
    showError('Trip overlaps with existing trip', `Conflicts with: ${dates}`),

  // Employee operations
  employeeAdded: () => showSuccess('Employee added successfully'),
  employeeUpdated: () => showSuccess('Employee updated successfully'),
  employeeDeleted: () => showSuccess('Employee removed'),

  // Auth operations
  signedIn: () => showSuccess('Welcome back!'),
  signedOut: () => showInfo('You have been signed out'),
  sessionExpired: () =>
    showWarning('Session expired', 'Please sign in again to continue'),
  passwordReset: () =>
    showSuccess('Password reset email sent', 'Check your inbox'),

  // Generic operations
  saved: () => showSuccess('Changes saved'),
  deleted: () => showSuccess('Deleted successfully'),
  copied: () => showSuccess('Copied to clipboard'),
  exported: () => showSuccess('Export complete'),

  // Errors
  networkError: () =>
    showError('Connection error', 'Please check your internet connection'),
  serverError: () =>
    showError('Server error', 'Please try again in a moment'),
  validationError: (message: string) => showError('Validation error', message),
  permissionDenied: () =>
    showError('Permission denied', 'You do not have access to this action'),
  notFound: () => showError('Not found', 'The requested item could not be found'),
}
