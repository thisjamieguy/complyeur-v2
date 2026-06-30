'use client'

import { useActionState, useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { loginWithFormState, signInWithGoogle, type LoginActionState } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const initialLoginActionState: LoginActionState = {
  error: null,
  email: '',
}

/**
 * Google Icon component
 * Using neutral colors per ComplyEur design standards (no Google branding colors)
 */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function LoginForm() {
  const [state, formAction, isLoginPending] = useActionState(
    loginWithFormState,
    initialLoginActionState
  )
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('next') || '/dashboard'
  const signupHref =
    redirectTo === '/dashboard'
      ? '/signup'
      : `/signup?next=${encodeURIComponent(redirectTo)}`

  // Show error from URL params (e.g., from OAuth callback failures)
  useEffect(() => {
    const error = searchParams.get('error')

    if (error) {
      toast.error(error)

      const params = new URLSearchParams(searchParams.toString())
      params.delete('error')
      const nextUrl = params.toString() ? `/login?${params.toString()}` : '/login'
      window.history.replaceState({}, '', nextUrl)
    }
  }, [searchParams])

  useEffect(() => {
    if (state.error) {
      toast.error(state.error)
    }
  }, [state.error])

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle(redirectTo)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Google sign-in failed')
      setIsGoogleLoading(false)
    }
    // Note: Don't set loading to false on success - the redirect will unmount the component
  }

  const isAnyLoading = isLoginPending || isGoogleLoading

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-xl shadow-slate-900/10">
      <div className="h-1 w-full bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400" />
      <CardHeader className="pb-4">
        <p className="inline-flex w-fit items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">
          Secure sign in
        </p>
        <CardTitle asChild>
          <h1 className="text-2xl">Welcome back</h1>
        </CardTitle>
        <CardDescription>
          Access your compliance dashboard and continue monitoring Schengen risk.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button
          type="button"
          variant="outline"
          className="w-full border-slate-300 bg-white hover:bg-slate-50"
          onClick={handleGoogleSignIn}
          disabled={isAnyLoading}
        >
          {isGoogleLoading ? (
            'Redirecting to Google...'
          ) : (
            <>
              <GoogleIcon className="mr-2 h-4 w-4" />
              Continue with Google
            </>
          )}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <div className="grid gap-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              name="email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              required
              disabled={isAnyLoading}
              defaultValue={state.email}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="login-password">Password</Label>
            <Input
              id="login-password"
              name="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={isAnyLoading}
            />
          </div>
          {state.error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={isAnyLoading}>
            {isLoginPending ? 'Signing in...' : 'Sign in with email'}
          </Button>
        </form>

        <div className="text-center space-y-3">
          <Link
            href="/forgot-password"
            className="inline-block text-sm text-brand-700 hover:underline py-2 min-h-[44px] leading-relaxed"
          >
            Forgot your password?
          </Link>
          <div className="text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <Link href={signupHref} className="text-brand-700 hover:underline py-2">
              Sign up
            </Link>
          </div>
          <div className="text-xs text-slate-500">
            Need help signing in? Use password reset or contact support.
          </div>
          <div className="text-xs text-slate-500 pt-1">
            Exploring first?{' '}
            <Link href="/landing" className="font-medium text-brand-700 hover:underline">
              Visit the landing page
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card className="border-slate-200/80 bg-white/95 shadow-xl shadow-slate-900/10">
        <CardHeader>
          <p className="inline-flex w-fit items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">
            Secure sign in
          </p>
          <CardTitle asChild>
            <h1 className="text-2xl">Welcome back</h1>
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    }>
      <LoginForm />
    </Suspense>
  )
}
