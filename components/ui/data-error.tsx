'use client'

import { AlertCircle, RefreshCw, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DataErrorProps {
  /** Resource name for the error message (e.g., "employees", "trips") */
  resource?: string
  /** Custom error message */
  message?: string
  /** Custom description */
  description?: string
  /** Callback to retry the operation */
  onRetry?: () => void
  /** Whether the retry is currently loading */
  isRetrying?: boolean
  /** Show contact support link */
  showSupport?: boolean
  /** Support email address */
  supportEmail?: string
  /** Additional class names */
  className?: string
}

/**
 * Data error component for failed data fetches
 *
 * Displays a user-friendly error message with:
 * - Icon and title
 * - Retry button (optional)
 * - Contact support link (optional)
 *
 * @example
 * <DataError
 *   resource="employees"
 *   onRetry={() => refetch()}
 *   isRetrying={isRefetching}
 * />
 */
export function DataError({
  resource = 'data',
  message,
  description,
  onRetry,
  isRetrying = false,
  showSupport = false,
  supportEmail = 'support@complyeur.com',
  className,
}: DataErrorProps) {
  const title = message || `Unable to load ${resource}`
  const desc =
    description ||
    'There was a problem loading this content. Please try again.'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
      role="alert"
    >
      <div className="p-4 bg-destructive/10 rounded-full">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>

      <h3 className="mt-4 text-lg font-semibold text-foreground">
        {title}
      </h3>

      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {desc}
      </p>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        {onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            variant="default"
            size="sm"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
        )}

        {showSupport && (
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a href={`mailto:${supportEmail}`}>
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Inline data error for smaller spaces
 */
interface InlineDataErrorProps {
  message?: string
  onRetry?: () => void
  className?: string
}

export function InlineDataError({
  message = 'Failed to load',
  onRetry,
  className,
}: InlineDataErrorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md',
        className
      )}
      role="alert"
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="ghost"
          size="sm"
          className="h-auto p-1 text-destructive hover:text-destructive"
        >
          <RefreshCw className="h-3 w-3" />
          <span className="sr-only">Retry</span>
        </Button>
      )}
    </div>
  )
}
