import type { EmployeeRiskLevel } from '@/types/dashboard'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  /** Risk level determining badge color */
  status: EmployeeRiskLevel
  /** Whether to show the text label (default: true) */
  showLabel?: boolean
  /** Additional CSS classes */
  className?: string
}

const statusConfig = {
  green: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    dot: 'bg-emerald-600',
    label: 'Compliant',
  },
  amber: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-400',
    dot: 'bg-amber-600',
    label: 'At Risk',
  },
  red: {
    bg: 'bg-rose-100',
    text: 'text-rose-800',
    border: 'border-rose-300',
    dot: 'bg-rose-600',
    label: 'Non-Compliant',
  },
  breach: {
    bg: 'bg-brand-800',
    text: 'text-white',
    border: 'border-brand-800',
    dot: 'bg-white',
    label: 'Breach',
  },
  exempt: {
    bg: 'bg-brand-100',
    text: 'text-brand-800',
    border: 'border-brand-300',
    dot: 'bg-brand-600',
    label: 'Exempt',
  },
} as const

/**
 * Status badge component displaying compliance risk level.
 * Uses color coding: green (compliant), amber (at-risk), red (non-compliant), breach (90+ days, black).
 */
export function StatusBadge({
  status,
  showLabel = true,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-sm font-medium border',
        config.bg,
        config.text,
        config.border,
        className
      )}
      role="status"
      aria-label={`Compliance status: ${config.label}`}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          config.dot
        )}
        aria-hidden="true"
      />
      {showLabel && config.label}
    </span>
  )
}

/**
 * Get the status configuration for a given risk level.
 * Useful for custom badge implementations.
 */
export function getStatusConfig(status: EmployeeRiskLevel) {
  return statusConfig[status]
}
