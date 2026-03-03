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
  description: string;
  countKey: 'safe' | 'atRisk' | 'critical';
  activeClassName: string;
}> = [
  {
    value: 'green',
    label: 'Compliant',
    description: 'Trips with comfortable headroom',
    countKey: 'safe',
    activeClassName: 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-[0_12px_30px_-22px_rgba(5,150,105,0.9)]',
  },
  {
    value: 'yellow',
    label: 'At Risk',
    description: 'Trips approaching the limit',
    countKey: 'atRisk',
    activeClassName: 'border-amber-300 bg-amber-50 text-amber-900 shadow-[0_12px_30px_-22px_rgba(217,119,6,0.9)]',
  },
  {
    value: 'red',
    label: 'Critical',
    description: 'Trips that breach the limit',
    countKey: 'critical',
    activeClassName: 'border-rose-300 bg-rose-50 text-rose-900 shadow-[0_12px_30px_-22px_rgba(225,29,72,0.9)]',
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
    <div className="rounded-[24px] border border-slate-200 bg-white/95 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          <label
            htmlFor="sort-select"
            className="text-sm font-medium text-slate-700"
          >
            Sort by:
          </label>
          <Select value={currentSortValue} onValueChange={handleSortChange}>
            <SelectTrigger
              id="sort-select"
              className="w-[230px] border-slate-200 bg-slate-50/80"
            >
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

        <div className="flex flex-col items-start gap-2 lg:items-end">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Show statuses
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {filterOptions.map((option) => {
              const isActive = currentFilter.includes(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleFilterChange(option.value)}
                  aria-pressed={isActive}
                  className={cn(
                    'group rounded-2xl border px-4 py-3 text-left transition-all',
                    'min-w-[132px] border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100/90',
                    isActive && option.activeClassName
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-semibold',
                        isActive
                          ? 'bg-white/80 text-current'
                          : 'bg-white text-slate-500'
                      )}
                    >
                      {stats[option.countKey]}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-current/75">
                    {option.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
