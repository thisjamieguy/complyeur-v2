'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

/**
 * Cloudflare Turnstile CAPTCHA Component
 *
 * Uses 'managed' mode by default - shows challenge only if needed (invisible for most users)
 * Supports dark/light themes and provides graceful degradation if Turnstile fails to load
 *
 * @example
 * <Turnstile
 *   siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
 *   onVerify={(token) => setTurnstileToken(token)}
 *   onError={() => setTurnstileError(true)}
 * />
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: TurnstileRenderOptions
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
      getResponse: (widgetId: string) => string | undefined
    }
    onTurnstileLoad?: () => void
  }
}

interface TurnstileRenderOptions {
  sitekey: string
  callback?: (token: string) => void
  'error-callback'?: () => void
  'expired-callback'?: () => void
  'timeout-callback'?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact' | 'invisible'
  appearance?: 'always' | 'execute' | 'interaction-only'
  action?: string
  cData?: string
  'response-field'?: boolean
  'response-field-name'?: string
  retry?: 'auto' | 'never'
  'retry-interval'?: number
  'refresh-expired'?: 'auto' | 'manual' | 'never'
  language?: string
}

export interface TurnstileProps {
  /** Cloudflare Turnstile site key */
  siteKey: string
  /** Called when verification succeeds with the token */
  onVerify?: (token: string) => void
  /** Called when verification fails */
  onError?: () => void
  /** Called when token expires */
  onExpire?: () => void
  /** Theme - defaults to 'auto' */
  theme?: 'light' | 'dark' | 'auto'
  /** Size - defaults to 'normal'. Use 'invisible' for no visual widget */
  size?: 'normal' | 'compact' | 'invisible'
  /** Appearance mode - 'interaction-only' shows only when needed */
  appearance?: 'always' | 'execute' | 'interaction-only'
  /** Optional action identifier for analytics */
  action?: string
  /** Name for hidden input field - defaults to 'cf-turnstile-response' */
  responseFieldName?: string
  /** Additional CSS classes */
  className?: string
}

// Track script loading state globally to avoid duplicate loads
let scriptLoadPromise: Promise<void> | null = null
let scriptLoaded = false

function loadTurnstileScript(): Promise<void> {
  if (scriptLoaded) {
    return Promise.resolve()
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.turnstile) {
      scriptLoaded = true
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
    script.async = true
    script.defer = true

    window.onTurnstileLoad = () => {
      scriptLoaded = true
      resolve()
    }

    script.onerror = () => {
      scriptLoadPromise = null
      reject(new Error('Failed to load Turnstile script'))
    }

    document.head.appendChild(script)
  })

  return scriptLoadPromise
}

export function Turnstile({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = 'auto',
  size = 'normal',
  appearance = 'interaction-only',
  action,
  responseFieldName = 'cf-turnstile-response',
  className = '',
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [token, setToken] = useState<string>('')

  const handleVerify = useCallback(
    (newToken: string) => {
      setToken(newToken)
      onVerify?.(newToken)
    },
    [onVerify]
  )

  const handleError = useCallback(() => {
    setToken('')
    setLoadError(true)
    onError?.()
    // Log for debugging but allow form submission
    console.warn('[Turnstile] Verification failed - allowing graceful degradation')
  }, [onError])

  const handleExpire = useCallback(() => {
    setToken('')
    onExpire?.()
  }, [onExpire])

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return
    }

    let mounted = true

    loadTurnstileScript()
      .then(() => {
        if (!mounted || !containerRef.current || !window.turnstile) {
          return
        }

        // Remove any existing widget
        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current)
          } catch {
            // Widget may already be removed
          }
        }

        // Render new widget
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: handleVerify,
          'error-callback': handleError,
          'expired-callback': handleExpire,
          'timeout-callback': handleError,
          theme,
          size,
          appearance,
          action,
          'response-field': true,
          'response-field-name': responseFieldName,
          retry: 'auto',
          'retry-interval': 5000,
          'refresh-expired': 'auto',
        })
      })
      .catch((err) => {
        console.error('[Turnstile] Failed to load:', err)
        setLoadError(true)
        onError?.()
      })

    return () => {
      mounted = false
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // Widget may already be removed
        }
        widgetIdRef.current = null
      }
    }
  }, [siteKey, theme, size, appearance, action, responseFieldName, handleVerify, handleError, handleExpire])

  // Reset function exposed for parent components
  const reset = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current)
      setToken('')
    }
  }, [])

  // If Turnstile fails to load, render a hidden input with empty value
  // The server should handle this gracefully
  if (loadError) {
    return (
      <input
        type="hidden"
        name={responseFieldName}
        value=""
        data-turnstile-error="true"
      />
    )
  }

  return (
    <>
      <div
        ref={containerRef}
        className={className}
        data-turnstile-container
      />
      {/* Hidden input is rendered by Turnstile itself when response-field is true */}
      {/* We also track the token in state for programmatic access */}
      {token && (
        <input
          type="hidden"
          name={`${responseFieldName}-verified`}
          value="true"
        />
      )}
    </>
  )
}

/**
 * Hook for programmatic Turnstile token access
 * Useful when you need to access the token outside of form submission
 */
export function useTurnstile() {
  const [token, setToken] = useState<string>('')
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState(false)

  const onVerify = useCallback((newToken: string) => {
    setToken(newToken)
    setIsVerified(true)
    setError(false)
  }, [])

  const onError = useCallback(() => {
    setToken('')
    setIsVerified(false)
    setError(true)
  }, [])

  const onExpire = useCallback(() => {
    setToken('')
    setIsVerified(false)
  }, [])

  const reset = useCallback(() => {
    setToken('')
    setIsVerified(false)
    setError(false)
  }, [])

  return {
    token,
    isVerified,
    error,
    onVerify,
    onError,
    onExpire,
    reset,
  }
}
