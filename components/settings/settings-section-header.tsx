import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingsSectionHeaderProps {
  /** Small uppercase label above the title (e.g. "Account"). */
  eyebrow?: string
  title: string
  description?: string
  icon?: LucideIcon
  /** Optional right-aligned action (button, link, badge). */
  action?: ReactNode
  className?: string
}

/**
 * Shared header for every settings page. Keeps titles, spacing, and the
 * hairline divider consistent across the whole settings area.
 */
export function SettingsSectionHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
  className,
}: SettingsSectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-600">
            {eyebrow}
          </p>
        )}
        <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-foreground">
          {Icon && <Icon className="h-5 w-5 text-brand-500" aria-hidden="true" />}
          {title}
        </h2>
        {description && (
          <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
