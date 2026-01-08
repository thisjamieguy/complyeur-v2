'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const RANGE_OPTIONS = [
  { label: '6 weeks', value: '6' },
  { label: '8 weeks', value: '8' },
  { label: '12 weeks', value: '12' },
] as const

interface RangeSelectorProps {
  value: number
  onChange: (weeks: number) => void
}

/**
 * Dropdown selector for forward date range (weeks ahead to display)
 */
export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500">Forward:</span>
      <Select
        value={String(value)}
        onValueChange={(v) => onChange(Number(v))}
      >
        <SelectTrigger className="w-28" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
