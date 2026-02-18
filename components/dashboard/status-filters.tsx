'use client'

import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { StatusFilter, ComplianceStats } from '@/types/dashboard'

interface StatusFiltersProps {
  /** Currently active filter */
  activeFilter: StatusFilter
  /** Callback when filter changes */
  onFilterChange: (filter: StatusFilter) => void
  /** Stats for showing counts in filter buttons */
  stats: ComplianceStats
}

interface FilterButtonProps {
  filter: StatusFilter
  label: string
  count: number
  isActive: boolean
  onFilterChange: (filter: StatusFilter) => void
}

const FilterButton = memo(function FilterButton({ filter, label, count, isActive, onFilterChange }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onFilterChange(filter)}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2',
        isActive
          ? 'bg-brand-700 text-white shadow-sm'
          : 'bg-white text-brand-600 border border-slate-200 hover:bg-brand-50 hover:border-brand-300 shadow-sm'
      )}
      aria-pressed={isActive}
      aria-label={`Filter by ${label}, ${count} employees`}
    >
      {label} ({count})
    </button>
  )
})

/**
 * Status filter buttons for the dashboard.
 * Allows filtering employees by compliance status: All, Compliant, At Risk, Non-Compliant, Breach.
 */
export const StatusFilters = memo(function StatusFilters({
  activeFilter,
  onFilterChange,
  stats,
}: StatusFiltersProps) {
  const filters = useMemo<{ filter: StatusFilter; label: string; count: number }[]>(() => [
    { filter: 'all', label: 'All', count: stats.total },
    { filter: 'green', label: 'Compliant', count: stats.compliant },
    { filter: 'amber', label: 'At Risk', count: stats.at_risk },
    { filter: 'red', label: 'Non-Compliant', count: stats.non_compliant },
    { filter: 'breach', label: 'Breach', count: stats.breach },
    ...(stats.exempt > 0
      ? [{ filter: 'exempt' as StatusFilter, label: 'Exempt', count: stats.exempt }]
      : []),
  ], [stats.total, stats.compliant, stats.at_risk, stats.non_compliant, stats.breach, stats.exempt])

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Filter employees by compliance status"
    >
      {filters.map(({ filter, label, count }) => (
        <FilterButton
          key={filter}
          filter={filter}
          label={label}
          count={count}
          isActive={activeFilter === filter}
          onFilterChange={onFilterChange}
        />
      ))}
    </div>
  )
})
