import Link from 'next/link'
import { Mail } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { validateRedirectUrl } from '@/lib/utils/redirect'

export const metadata = {
  title: 'Check your email',
  description: 'Confirm your email address to continue',
}

interface CheckEmailPageProps {
  searchParams: Promise<{ next?: string }>
}

export default async function CheckEmailPage({ searchParams }: CheckEmailPageProps) {
  const params = await searchParams
  const redirectTo = validateRedirectUrl(params.next)
  const loginHref =
    redirectTo === '/dashboard'
      ? '/login'
      : `/login?next=${encodeURIComponent(redirectTo)}`
  const signupHref =
    redirectTo === '/dashboard'
      ? '/signup'
      : `/signup?next=${encodeURIComponent(redirectTo)}`

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white/95 shadow-xl shadow-slate-900/10">
      <div className="h-1 w-full bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400" />
      <CardHeader className="pb-4 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 ring-1 ring-brand-200">
          <Mail className="h-7 w-7 text-brand-600" />
        </div>
        <CardTitle asChild>
          <h1 className="text-2xl">Check your email</h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-sm text-slate-600">
            We&apos;ve sent a confirmation link to your email address.
            Click the link to verify your account, then sign in.
          </p>
          <p className="text-xs text-slate-500">
            Can&apos;t find it? Check your spam or junk folder.
          </p>
        </div>

        <Button asChild className="w-full">
          <Link href={loginHref}>Go to sign in</Link>
        </Button>

        <p className="text-xs text-slate-500">
          Wrong email?{' '}
          <Link href={signupHref} className="font-medium text-brand-700 hover:underline">
            Sign up again
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
