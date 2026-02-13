'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { joinWaitlist, type WaitlistState } from '../landing/actions'
import { cn } from '@/lib/utils'
import { Turnstile } from '@/components/ui/turnstile'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

export function WaitlistForm({ variant = 'default' }: { variant?: 'default' | 'minimal' }) {
  const [state, formAction, isPending] = useActionState<WaitlistState, FormData>(joinWaitlist, {
    success: false,
    message: '',
  })
  const formRef = useRef<HTMLFormElement>(null)
  const [turnstileError, setTurnstileError] = useState(false)
  const [shouldLoadTurnstile, setShouldLoadTurnstile] = useState(false)
  const emailId = `email-${variant}`
  const companyId = `companyName-${variant}`
  const errorId = `waitlist-error-${variant}`
  const statusId = `waitlist-status-${variant}`

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset()
    }
  }, [state.success])

  if (state.success) {
    return (
      <div
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <svg
            className="h-6 w-6 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="font-medium text-emerald-800">{state.message}</p>
        <p className="mt-2 text-sm text-emerald-700">You can close this page now. We will email next steps.</p>
      </div>
    )
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4"
      noValidate
      onFocusCapture={() => setShouldLoadTurnstile(true)}
      onPointerEnter={() => setShouldLoadTurnstile(true)}
    >
      <div className={cn('flex gap-3', variant === 'minimal' ? 'flex-col sm:flex-row' : 'flex-col')}>
        <div className="flex-1">
          <label htmlFor={emailId} className="sr-only">
            Email address
          </label>
          <input
            type="email"
            id={emailId}
            name="email"
            autoComplete="email"
            placeholder="you@company.com"
            required
            aria-required="true"
            aria-invalid={state.error === 'validation' ? 'true' : undefined}
            aria-describedby={state.message && !state.success ? errorId : statusId}
            className="h-12 w-full rounded-xl border border-slate-300/80 bg-white px-4 text-slate-900 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
          />
        </div>
        {variant === 'default' && (
          <div className="flex-1">
            <label htmlFor={companyId} className="sr-only">
              Company name (optional)
            </label>
            <input
              type="text"
              id={companyId}
              name="companyName"
              autoComplete="organization"
              placeholder="Company name (optional)"
              className="h-12 w-full rounded-xl border border-slate-300/80 bg-white px-4 text-slate-900 placeholder:text-slate-500 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/60"
            />
          </div>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="h-12 whitespace-nowrap rounded-xl bg-slate-900 px-8 font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 motion-safe:animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting...
            </span>
          ) : (
            'Apply for Early Access'
          )}
        </button>
      </div>

      <p id={statusId} className="sr-only" role="status" aria-live="polite">
        {isPending ? 'Submitting your waitlist request.' : ''}
      </p>

      {isPending && (
        <p className="text-xs text-slate-500" role="status" aria-live="polite">
          Submitting your waitlist request...
        </p>
      )}

      {TURNSTILE_SITE_KEY && shouldLoadTurnstile && (
        <Turnstile
          siteKey={TURNSTILE_SITE_KEY}
          onError={() => setTurnstileError(true)}
          theme="auto"
          size="normal"
          appearance="interaction-only"
          action="waitlist"
          responseFieldName="cf-turnstile-response"
          className="mt-4"
        />
      )}

      {state.message && !state.success && (
        <p id={errorId} className="mt-2 text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}

      {turnstileError && !state.message && (
        <p className="mt-2 text-xs text-amber-700">
          Security verification is unavailable. The form will still submit.
        </p>
      )}

      <p className="mt-3 text-xs text-slate-500">No spam. Product updates only.</p>
    </form>
  )
}
