'use client'

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
  onClick: () => void
}

function FilterButton({ label, count, isActive, onClick }: Omit<FilterButtonProps, 'filter'>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        isActive
          ? 'bg-slate-900 text-white'
          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
      )}
      aria-pressed={isActive}
      aria-label={`Filter by ${label}, ${count} employees`}
    >
      {label} ({count})
    </button>
  )
}

/**
 * Status filter buttons for the dashboard.
 * Allows filtering employees by compliance status: All, Compliant, At Risk, Non-Compliant, Breach.
 */
export function StatusFilters({
  activeFilter,
  onFilterChange,
  stats,
}: StatusFiltersProps) {
  const filters: { filter: StatusFilter; label: string; count: number }[] = [
    { filter: 'all', label: 'All', count: stats.total },
    { filter: 'green', label: 'Compliant', count: stats.compliant },
    { filter: 'amber', label: 'At Risk', count: stats.at_risk },
    { filter: 'red', label: 'Non-Compliant', count: stats.non_compliant },
    { filter: 'breach', label: 'Breach', count: stats.breach },
  ]

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Filter employees by compliance status"
    >
      {filters.map(({ filter, label, count }) => (
        <FilterButton
          key={filter}
          label={label}
          count={count}
          isActive={activeFilter === filter}
          onClick={() => onFilterChange(filter)}
        />
      ))}
    </div>
  )
}
