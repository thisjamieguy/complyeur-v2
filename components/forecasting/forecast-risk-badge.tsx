'use client';

/**
 * Forecast Risk Badge Component
 *
 * Displays risk level with color-coded badge.
 * Uses 'yellow' instead of 'amber' for forecast-specific semantics.
 */

import { cn } from '@/lib/utils';
import type { ForecastRiskLevel } from '@/types/forecast';

interface ForecastRiskBadgeProps {
  riskLevel: ForecastRiskLevel;
  showLabel?: boolean;
  className?: string;
}

const riskConfig = {
  green: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
    label: 'Safe',
  },
  yellow: {
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
    label: 'Over Limit',
  },
} as const;

export function ForecastRiskBadge({
  riskLevel,
  showLabel = true,
  className,
}: ForecastRiskBadgeProps) {
  const config = riskConfig[riskLevel];

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
      aria-label={`Risk level: ${config.label}`}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', config.dot)}
        aria-hidden="true"
      />
      {showLabel && config.label}
    </span>
  );
}
