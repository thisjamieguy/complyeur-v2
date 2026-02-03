import type { RiskLevel } from '@/lib/compliance'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  /** Risk level determining badge color */
  status: RiskLevel
  /** Whether to show the text label (default: true) */
  showLabel?: boolean
  /** Additional CSS classes */
  className?: string
}

const statusConfig = {
  green: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
    label: 'Compliant',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    label: 'At Risk',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
    label: 'Non-Compliant',
  },
  breach: {
    bg: 'bg-slate-900',
    text: 'text-white',
    border: 'border-slate-900',
    dot: 'bg-white',
    label: 'Breach',
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
export function getStatusConfig(status: RiskLevel) {
  return statusConfig[status]
}
