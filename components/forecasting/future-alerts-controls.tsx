'use client';

/**
 * Controls Component for Future Alerts
 *
 * Provides sorting and filtering options for the future alerts table.
 */

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
  ForecastRiskLevel,
  ForecastSortField,
  SortOrder,
  ForecastRiskFilter,
} from '@/types/forecast';

interface FutureAlertsControlsProps {
  currentSort: ForecastSortField;
  currentOrder: SortOrder;
  currentFilter: ForecastRiskFilter;
  stats: {
    total: number;
    safe: number;
    atRisk: number;
    critical: number;
  };
}

const sortOptions: Array<{ value: string; label: string }> = [
  { value: 'date-asc', label: 'Date (soonest first)' },
  { value: 'date-desc', label: 'Date (latest first)' },
  { value: 'employee-asc', label: 'Employee (A-Z)' },
  { value: 'employee-desc', label: 'Employee (Z-A)' },
  { value: 'risk-asc', label: 'Risk (critical first)' },
  { value: 'risk-desc', label: 'Risk (safe first)' },
];

const filterOptions: Array<{
  value: ForecastRiskLevel;
  label: string;
  countKey: 'safe' | 'atRisk' | 'critical';
  activeClassName: string;
}> = [
  {
    value: 'green',
    label: 'Compliant',
    countKey: 'safe',
    activeClassName: 'border-green-300 bg-green-50 text-green-800',
  },
  {
    value: 'yellow',
    label: 'At Risk',
    countKey: 'atRisk',
    activeClassName: 'border-amber-300 bg-amber-50 text-amber-800',
  },
  {
    value: 'red',
    label: 'Critical',
    countKey: 'critical',
    activeClassName: 'border-red-300 bg-red-50 text-red-800',
  },
];

export function FutureAlertsControls({
  currentSort,
  currentOrder,
  currentFilter,
  stats,
}: FutureAlertsControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSortValue = `${currentSort}-${currentOrder}`;

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      params.set(key, value);
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSortChange = (value: string) => {
    const [sort, order] = value.split('-') as [ForecastSortField, SortOrder];
    updateParams({ sort, order });
  };

  const handleFilterChange = (value: ForecastRiskLevel) => {
    const nextFilter = currentFilter.includes(value)
      ? currentFilter.filter((entry) => entry !== value)
      : [...currentFilter, value];

    const params = new URLSearchParams(searchParams.toString());
    if (nextFilter.length === 0) {
      params.set('filter', 'none');
    } else {
      params.set('filter', nextFilter.join(','));
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <label
          htmlFor="sort-select"
          className="text-sm font-medium text-slate-700"
        >
          Sort by:
        </label>
        <Select value={currentSortValue} onValueChange={handleSortChange}>
          <SelectTrigger id="sort-select" className="w-[200px]">
            <SelectValue placeholder="Select sort" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        {filterOptions.map((option) => {
          const isActive = currentFilter.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleFilterChange(option.value)}
              aria-pressed={isActive}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? option.activeClassName
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
              )}
            >
              {option.label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs',
                  isActive
                    ? 'bg-white/70 text-current'
                    : 'bg-white text-slate-500'
                )}
              >
                {stats[option.countKey]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
