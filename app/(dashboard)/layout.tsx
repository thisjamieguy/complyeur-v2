import { createClient } from '@/lib/supabase/server'
import { enforceMfaForPrivilegedUser } from '@/lib/security/mfa'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { DataRefreshHandler } from '@/components/data-refresh-handler'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // This should be handled by middleware, but redirect as a safety net
    redirect('/login')
  }

  const [mfa, { data: profile, error: profileError }] = await Promise.all([
    enforceMfaForPrivilegedUser(supabase, user.id, user.email),
    supabase
      .from('profiles')
      .select('role, is_superadmin, first_name, last_name')
      .eq('id', user.id)
      .single(),
  ])

  if (!mfa.ok) {
    redirect('/mfa')
  }

  if (profileError) {
    if (profileError.code === 'PGRST116') {
      console.error('[DashboardLayout] User profile not found for authenticated user')
    } else {
      console.error('[DashboardLayout] Failed to fetch user profile:', profileError.message)
    }
  }

  const derivedFullName = [profile?.first_name, profile?.last_name]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ')

  // Build user object for AppShell
  const appUser = {
    id: user.id,
    email: user.email ?? '',
    full_name: derivedFullName || null,
    role: profile?.role ?? null,
  }

  return (
    <AppShell user={appUser}>
      <DataRefreshHandler />
      {children}
    </AppShell>
  )
}
