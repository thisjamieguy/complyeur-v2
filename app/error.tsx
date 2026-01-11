'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report the error to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-red-600">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. Our team has been notified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="p-3 bg-red-50 rounded-md text-sm text-red-700 font-mono overflow-auto">
              {error.message}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={reset} variant="default">
              Try again
            </Button>
            <Button
              onClick={() => (window.location.href = '/')}
              variant="outline"
            >
              Go home
            </Button>
          </div>
          {error.digest && (
            <p className="text-xs text-gray-500">Error ID: {error.digest}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
