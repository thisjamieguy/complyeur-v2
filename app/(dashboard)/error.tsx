'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-red-600">Dashboard Error</CardTitle>
          <CardDescription>
            We encountered a problem loading this page.
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
              onClick={() => (window.location.href = '/dashboard')}
              variant="outline"
            >
              Go to Dashboard
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
