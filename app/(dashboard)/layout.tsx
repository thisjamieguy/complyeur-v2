import Link from 'next/link'
import { redirect } from 'next/navigation'
import { logout } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/server'
import { MobileNav } from '@/components/navigation/mobile-nav'
import { OfflineBanner } from '@/components/ui/offline-banner'
import { Footer } from '@/components/layout/footer'

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

  // Fetch the user's profile to get their name and role
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // Build display name from full_name or fall back to email
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User'
  const role = profile?.role || 'viewer'

  // Map role to display label
  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    manager: 'Manager',
    viewer: 'Viewer',
  }
  const roleLabel = roleLabels[role] || role

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <OfflineBanner />
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          {/* Mobile: hamburger + logo centered */}
          <div className="flex items-center gap-2 lg:gap-6">
            <MobileNav />
            <Link href="/dashboard">
              <h1 className="text-xl font-semibold text-slate-900">ComplyEUR</h1>
            </Link>
          </div>

          {/* Desktop navigation - hidden on mobile */}
          <nav className="hidden lg:flex items-center space-x-4 flex-1 ml-6">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/import"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Import
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
            <Link
              href="/gdpr"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              GDPR
            </Link>
          </nav>

          {/* User info and sign out */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Hide user details on smallest screens */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900">{displayName}</span>
              <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                {roleLabel}
              </Badge>
            </div>
            <span className="hidden md:inline text-sm text-slate-500">{user.email}</span>
            <form action={logout}>
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-4 py-6 sm:py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] w-full">
        {children}
      </main>
      <Footer />
    </div>
  )
}
