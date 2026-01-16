import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { OfflineBanner } from '@/components/ui/offline-banner'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the user's profile to get their name and role
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email!,
        full_name: profile?.full_name,
        role: profile?.role,
      }}
    >
      <OfflineBanner />
      {children}
    </AppShell>
  )
}
