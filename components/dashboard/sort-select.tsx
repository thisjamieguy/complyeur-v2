'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SortOption, SortOptionConfig } from '@/types/dashboard'

interface SortSelectProps {
  /** Currently selected sort option */
  value: SortOption
  /** Callback when sort option changes */
  onValueChange: (value: SortOption) => void
}

const sortOptions: SortOptionConfig[] = [
  { value: 'days_remaining_asc', label: 'Days remaining (low to high)' },
  { value: 'days_remaining_desc', label: 'Days remaining (high to low)' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'days_used_desc', label: 'Days used (high to low)' },
  { value: 'days_used_asc', label: 'Days used (low to high)' },
]

/**
 * Sort dropdown for the compliance table.
 * Allows sorting by days remaining, name, or days used.
 */
export function SortSelect({ value, onValueChange }: SortSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="sort-select"
        className="text-sm font-medium text-slate-500 whitespace-nowrap"
      >
        Sort by:
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="sort-select" className="w-[220px]">
          <SelectValue placeholder="Select sort order" />
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
  )
}
