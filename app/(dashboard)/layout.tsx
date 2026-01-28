import { createClient } from '@/lib/supabase/server'
import { enforceMfaForPrivilegedUser } from '@/lib/security/mfa'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // This should be handled by middleware, but just in case
    return null
  }

  // Check if user is privileged (admin or superadmin) and enforce MFA
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_superadmin, full_name')
    .eq('id', user.id)
    .single()

  // Handle profile query securely to prevent MFA bypass for privileged users
  // If we can't determine privilege level (error or null), we can't safely skip MFA enforcement
  if (profileError || !profile) {
    if (profileError) {
      // Log the error for debugging
      if (profileError.code === 'PGRST116') {
        console.error('[DashboardLayout] User profile not found for authenticated user:', user.id)
      } else {
        console.error('[DashboardLayout] Failed to fetch user profile:', profileError)
      }
    }
    // Security: If we can't determine privilege level, we can't verify the user is NOT privileged
    // Therefore, we must require MFA to prevent privileged users from bypassing MFA enforcement
    // This ensures that even if a privileged user's profile lookup fails, MFA is still enforced
    const mfa = await enforceMfaForPrivilegedUser(supabase, user.id)
    if (!mfa.ok) {
      redirect('/mfa')
    }
  } else {
    // Profile successfully retrieved - check privilege and enforce MFA
    const isPrivileged = profile.role === 'admin' || profile.is_superadmin === true

    if (isPrivileged) {
      const mfa = await enforceMfaForPrivilegedUser(supabase, user.id)
      if (!mfa.ok) {
        redirect('/mfa')
      }
    }
  }

  // Build user object for AppShell
  const appUser = {
    id: user.id,
    email: user.email ?? '',
    full_name: profile?.full_name ?? null,
    role: profile?.role ?? null,
  }

  return (
    <AppShell user={appUser}>
      {children}
    </AppShell>
  )
}