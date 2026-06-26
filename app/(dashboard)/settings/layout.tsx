import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { canViewSettings } from '@/lib/actions/settings'
import { SettingsNav } from './settings-nav'

export const metadata = {
  title: 'Settings',
  description: 'Manage your account, company configuration, team, billing, and data controls',
}

/**
 * Shared shell for every settings route. Renders the masthead and the
 * persistent left rail, and gates the whole area behind view permission so
 * individual pages don't each repeat the check.
 */
export default async function SettingsLayout({
  children,
}: {
  children: ReactNode
}) {
  const canView = await canViewSettings()

  if (!canView) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-600">
          Settings
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Workspace &amp; account
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Manage your personal account, company configuration, team, billing, and data
          controls — all in one place.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-10">
        <aside>
          <SettingsNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
