'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Auth error:', error)
  }, [error])

  return (
    <Card className="max-w-md w-full">
      <CardHeader>
        <CardTitle className="text-red-600">Authentication Error</CardTitle>
        <CardDescription>
          We encountered a problem. Please try again.
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
            onClick={() => (window.location.href = '/login')}
            variant="outline"
          >
            Back to Login
          </Button>
        </div>
        {error.digest && (
          <p className="text-xs text-gray-500">Error ID: {error.digest}</p>
        )}
      </CardContent>
    </Card>
  )
}
