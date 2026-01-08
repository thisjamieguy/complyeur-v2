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
    label: 'Compliant',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    label: 'At Risk',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    label: 'Non-Compliant',
  },
} as const

/**
 * Status badge component displaying compliance risk level.
 * Uses color coding: green (safe), amber (at-risk), red (critical).
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
          status === 'green' && 'bg-green-500',
          status === 'amber' && 'bg-amber-500',
          status === 'red' && 'bg-red-500'
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
