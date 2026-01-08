'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function CalendarError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Calendar error:', error)
  }, [error])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Travel Calendar
        </h1>
        <p className="text-slate-500 mt-1">
          Visual timeline of employee Schengen travel
        </p>
      </div>

      {/* Error state */}
      <Card className="rounded-xl">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            Failed to load calendar
          </h3>
          <p className="text-slate-500 text-center max-w-md mb-6">
            There was an error loading the calendar data. Please try again.
          </p>
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
