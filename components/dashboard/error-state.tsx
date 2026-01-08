'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  /** Optional custom error message */
  message?: string
  /** Optional custom action button text */
  actionLabel?: string
  /** Optional callback for the action button (defaults to page reload) */
  onAction?: () => void
}

/**
 * Error state displayed when data fetching fails.
 * Provides a refresh button to retry loading.
 */
export function ErrorState({
  message = 'Unable to load compliance data',
  actionLabel = 'Refresh Page',
  onAction,
}: ErrorStateProps) {
  const handleAction = () => {
    if (onAction) {
      onAction()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="p-4 bg-red-50 rounded-full">
          <AlertCircle className="h-12 w-12 text-red-400" />
        </div>
        <h3 className="mt-4 text-lg font-medium text-slate-900">{message}</h3>
        <p className="mt-2 text-center text-slate-500 max-w-sm">
          Please try refreshing the page. If the problem persists, contact
          support.
        </p>
        <Button variant="outline" className="mt-6" onClick={handleAction}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      </div>
    </div>
  )
}
