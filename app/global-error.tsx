'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// global-error.tsx catches errors in the root layout and template
// It must define its own <html> and <body> tags since it replaces the root layout when triggered
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-xl font-semibold text-red-600 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-4">
              An unexpected error occurred. Our team has been notified.
            </p>
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Try again
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Go home
              </button>
            </div>
            {error.digest && (
              <p className="text-xs text-gray-500 mt-4">Error ID: {error.digest}</p>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
