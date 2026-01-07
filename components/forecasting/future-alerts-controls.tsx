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
import type { ForecastSortField, SortOrder, ForecastRiskFilter } from '@/types/forecast';

interface FutureAlertsControlsProps {
  currentSort: ForecastSortField;
  currentOrder: SortOrder;
  currentFilter: ForecastRiskFilter;
  stats: {
    total: number;
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
  value: ForecastRiskFilter;
  label: string;
  countKey: 'total' | 'atRisk' | 'critical';
}> = [
  { value: 'all', label: 'All', countKey: 'total' },
  { value: 'at-risk', label: 'At Risk', countKey: 'atRisk' },
  { value: 'critical', label: 'Critical', countKey: 'critical' },
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

  const handleFilterChange = (value: ForecastRiskFilter) => {
    updateParams({ filter: value });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        {/* Sort selector */}
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
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleFilterChange(option.value)}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              currentFilter === option.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {option.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-xs',
                currentFilter === option.value
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-slate-200/50 text-slate-500'
              )}
            >
              {stats[option.countKey]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
