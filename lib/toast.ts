import { toast } from 'sonner'

/**
 * Toast helper functions for consistent user feedback
 *
 * Duration defaults:
 * - Success: 3 seconds (auto-dismiss)
 * - Error: 5 seconds (longer for user to read)
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
