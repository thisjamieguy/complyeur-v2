'use client'

import { Component, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Fallback component to render when an error occurs */
  fallback?: ReactNode
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * React Error Boundary component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs the error, and displays a fallback UI.
 *
 * Note: Error boundaries do not catch errors in:
 * - Event handlers
 * - Asynchronous code
 * - Server-side rendering
 * - Errors thrown in the error boundary itself
 *
 * @example
 * <ErrorBoundary
 *   onError={(error) => logError(error)}
 *   fallback={<CustomErrorUI />}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console (Sentry integration can be added later)
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)

    // Call optional error callback
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Default error fallback component
 */
interface ErrorFallbackProps {
  error: Error | null
  onReset?: () => void
}

export function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  return (
    <Card className="max-w-md mx-auto my-8">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">Something went wrong</CardTitle>
        </div>
        <CardDescription>
          An error occurred while rendering this section.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {process.env.NODE_ENV === 'development' && error && (
          <div className="p-3 bg-destructive/10 rounded-md text-sm text-destructive font-mono overflow-auto max-h-32">
            {error.message}
          </div>
        )}
        <div className="flex gap-3">
          {onReset && (
            <Button onClick={onReset} variant="default" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
          >
            Reload Page
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * HOC to wrap a component with an error boundary
 *
 * @example
 * const SafeMyComponent = withErrorBoundary(MyComponent)
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`

  return WrappedComponent
}
