'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signup, signInWithGoogle } from '../actions'
import { signupSchema, type SignupInput } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from 'sonner'

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

function SignupForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const searchParams = useSearchParams()

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      companyName: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    },
  })

  // Show error from URL params (e.g., from OAuth callback failures)
  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      toast.error(error)
      // Clear the error from URL without full page reload
      window.history.replaceState({}, '', '/signup')
    }
  }, [searchParams])

  async function onSubmit(data: SignupInput) {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('email', data.email)
      formData.append('companyName', data.companyName)
      formData.append('password', data.password)
      formData.append('confirmPassword', data.confirmPassword)
      formData.append('termsAccepted', String(data.termsAccepted))
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
    // Note: Don't set loading to false on success - the redirect will unmount the component
  }

  const isAnyLoading = isLoading || isGoogleLoading

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Set up your company and start managing Schengen compliance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Google OAuth Button */}
        <div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
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
          <p className="mt-2 text-xs text-muted-foreground text-center">
            By signing up with Google, you agree to our{' '}
            <Link
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Terms
            </Link>{' '}
            and{' '}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Privacy Policy
            </Link>
          </p>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or create account with email
            </span>
          </div>
        </div>

        {/* Email/Password Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email"
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
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Enter your company name"
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
              name="termsAccepted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
                  <FormControl>
                    <Checkbox
                      id="terms-accepted"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isAnyLoading}
                      aria-labelledby="terms-label"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <label
                      id="terms-label"
                      htmlFor="terms-accepted"
                      className="text-sm font-normal cursor-pointer leading-none"
                    >
                      I agree to the{' '}
                      <Link
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Privacy Policy
                      </Link>
                    </label>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isAnyLoading}>
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </Form>

        {/* Links */}
        <div className="text-center">
          <div className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <Card>
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    }>
      <SignupForm />
    </Suspense>
  )
}
