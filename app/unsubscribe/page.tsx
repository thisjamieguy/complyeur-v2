import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Invalid Unsubscribe Link
          </h1>
          <p className="text-slate-600 mb-6">
            This unsubscribe link is missing or invalid. Please use the link from your email.
          </p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Call the unsubscribe function
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('unsubscribe_by_token', {
    token: token,
  })

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">
            Unsubscribe Failed
          </h1>
          <p className="text-slate-600 mb-6">
            {error?.message || 'This unsubscribe link may have already been used or is invalid.'}
          </p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          Successfully Unsubscribed
        </h1>
        <p className="text-slate-600 mb-6">
          You have been unsubscribed from all ComplyEUR email notifications.
          You can re-enable notifications at any time from your account settings.
        </p>
        <div className="space-y-3">
          <Link href="/dashboard">
            <Button className="w-full">Go to Dashboard</Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" className="w-full">
              Manage Preferences
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
