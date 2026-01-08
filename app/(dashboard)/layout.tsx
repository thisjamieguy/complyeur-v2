import Link from 'next/link'
import { redirect } from 'next/navigation'
import { logout } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // This should be handled by middleware, but just in case
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <Link href="/dashboard">
              <h1 className="text-xl font-semibold text-slate-900">ComplyEUR</h1>
            </Link>
            <nav className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/calendar"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Calendar
              </Link>
              <Link
                href="/future-job-alerts"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Future Alerts
              </Link>
              <Link
                href="/trip-forecast"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Trip Forecast
              </Link>
              <Link
                href="/settings"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-600">{user.email}</span>
            <form action={logout}>
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
