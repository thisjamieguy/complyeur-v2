'use client'

import { useState, useEffect, Suspense, type ComponentType } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, BarChart3, ShieldCheck } from 'lucide-react'
import { signup, signInWithGoogle } from '../actions'
import { emailSignupSchema, type EmailSignupInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from 'sonner'

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

function SignupFeature({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-200" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-slate-200">{description}</p>
    </div>
  )
}

function SignupForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const searchParams = useSearchParams()

  const form = useForm<EmailSignupInput>({
    resolver: zodResolver(emailSignupSchema),
    defaultValues: {
      name: '',
      email: '',
      companyName: '',
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      toast.error(error)
      window.history.replaceState({}, '', '/signup')
    }
  }, [searchParams])

  async function onSubmit(data: EmailSignupInput) {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('email', data.email)
      formData.append('companyName', data.companyName)
      formData.append('password', data.password)
      formData.append('confirmPassword', data.confirmPassword)
      await signup(formData)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Signup failed')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Google sign-in failed')
      setIsGoogleLoading(false)
    }
  }

  const isAnyLoading = isLoading || isGoogleLoading

  return (
    <section className="grid overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-xl shadow-slate-900/10 lg:grid-cols-2">
      <div className="p-6 sm:p-8 lg:p-10">
        <div className="mb-8">
          <p className="inline-flex w-fit items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">
            Get started
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">Create your account</h1>
          <p className="mt-2 text-sm text-slate-600">
            Set up your workspace and start tracking Schengen compliance today.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Your full name"
                      autoComplete="name"
                      required
                      disabled={isAnyLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@company.com"
                      autoComplete="email"
                      required
                      disabled={isAnyLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Your company name"
                      autoComplete="organization"
                      required
                      disabled={isAnyLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Create a password (min 8 characters)"
                      autoComplete="new-password"
                      required
                      disabled={isAnyLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      required
                      disabled={isAnyLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="mt-2 h-11 w-full text-base" disabled={isAnyLoading}>
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </Form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Or continue with
          </span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full border-slate-300 bg-white text-base hover:bg-slate-50"
          onClick={handleGoogleSignIn}
          disabled={isAnyLoading}
        >
          {isGoogleLoading ? (
            'Redirecting to Google...'
          ) : (
            <>
              <GoogleIcon className="mr-2 h-5 w-5" />
              Continue with Google
            </>
          )}
        </Button>

        <p className="mt-4 text-xs text-slate-500">
          By signing up, you agree to our{' '}
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-700 hover:underline"
          >
            Terms
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-700 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>

        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <aside className="relative border-t border-slate-200 bg-slate-900 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 right-0 h-52 w-52 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-brand-300/15 blur-3xl" />
        </div>
        <div className="relative space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-200/90">
              Compliance-first workflow
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              See risk early and keep your team moving.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">
              ComplyEur gives your team one place to plan travel, monitor allowance, and export
              defensible records when it matters.
            </p>
          </div>

          <div className="space-y-3">
            <SignupFeature
              icon={ShieldCheck}
              title="90/180 tracking"
              description="Automatically monitor rolling-day allowances for every traveler."
            />
            <SignupFeature
              icon={AlertTriangle}
              title="Proactive risk alerts"
              description="Flag upcoming breaches before plans become expensive mistakes."
            />
            <SignupFeature
              icon={BarChart3}
              title="Audit-ready exports"
              description="Generate concise reports for internal checks or external review."
            />
          </div>

          <div className="rounded-xl border border-white/15 bg-white/10 p-4">
            <p className="text-sm font-medium text-white">Built for operational confidence.</p>
            <p className="mt-1 text-sm text-slate-200">
              Keep travel decisions, risk visibility, and compliance evidence in one flow.
            </p>
          </div>
        </div>
      </aside>
    </section>
  )
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-slate-200/80 bg-white/95 shadow-xl shadow-slate-900/10">
          <CardHeader>
            <p className="inline-flex w-fit items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-brand-700">
              Get started
            </p>
            <CardTitle asChild>
              <h1 className="text-2xl">Create your account</h1>
            </CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <SignupForm />
    </Suspense>
  )
}
