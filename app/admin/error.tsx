'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ADMIN ERROR]', error.message, error.stack, error.digest)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-red-600">Admin Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Something went wrong loading this admin page.
          </p>
          <div className="flex gap-3">
            <Button onClick={reset}>Try again</Button>
            <Button
              onClick={() => (window.location.href = '/admin')}
              variant="outline"
            >
              Back to Admin
            </Button>
          </div>
          {error.digest && (
            <p className="text-xs text-slate-500">Error ID: {error.digest}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
