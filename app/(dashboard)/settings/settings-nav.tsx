'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  Columns3,
  CreditCard,
  History,
  ShieldCheck,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SettingsNavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Only match the exact path (used for the index "Account" route). */
  exact?: boolean
}

interface SettingsNavGroup {
  label: string
  items: SettingsNavItem[]
}

const NAV_GROUPS: SettingsNavGroup[] = [
  {
    label: 'Personal',
    items: [{ href: '/settings', label: 'Account', icon: User, exact: true }],
  },
  {
    label: 'Organisation',
    items: [
      { href: '/settings/company', label: 'Company', icon: Building2 },
      { href: '/settings/team', label: 'Team', icon: Users },
      { href: '/settings/billing', label: 'Billing', icon: CreditCard },
    ],
  },
  {
    label: 'Data & privacy',
    items: [
      { href: '/settings/mappings', label: 'Column mappings', icon: Columns3 },
      { href: '/settings/import-history', label: 'Import history', icon: History },
      { href: '/settings/privacy', label: 'Privacy & data', icon: ShieldCheck },
    ],
  },
]

function isItemActive(pathname: string, item: SettingsNavItem): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Settings sections" className="lg:sticky lg:top-8">
      <div className="space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = isItemActive(pathname, item)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-brand-50 font-semibold text-brand-900'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-600"
                    />
                  )}
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      active
                        ? 'text-brand-600'
                        : 'text-muted-foreground group-hover:text-foreground'
                    )}
                    aria-hidden="true"
                  />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </div>
    </nav>
  )
}
