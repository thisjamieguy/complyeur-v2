'use client'

import { AlertCircle, XCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface FormErrorProps {
  /** Error title (optional, defaults to "Error") */
  title?: string
  /** Error message to display */
  message: string
  /** Optional callback to dismiss the error */
  onDismiss?: () => void
  /** Optional class name for styling */
  className?: string
}

/**
 * Displays form-level errors (not field-specific)
 *
 * Use this for:
 * - API errors after form submission
 * - Server-side validation errors
 * - Network errors
 *
 * @example
 * {error && (
 *   <FormError
 *     message={error}
 *     onDismiss={() => setError(null)}
 *   />
 * )}
 */
export function FormError({
  title,
  message,
  onDismiss,
  className,
}: FormErrorProps) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription className="flex items-start justify-between gap-2">
        <span>{message}</span>
        {onDismiss && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-5 w-5 -mr-2 -mt-1 shrink-0 hover:bg-destructive/20"
            onClick={onDismiss}
          >
            <XCircle className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

/**
 * Displays a warning message (less severe than error)
 */
interface FormWarningProps {
  message: string
  className?: string
}

export function FormWarning({ message, className }: FormWarningProps) {
  return (
    <Alert className={`border-amber-500 bg-amber-50 text-amber-800 ${className || ''}`}>
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        {message}
      </AlertDescription>
    </Alert>
  )
}
