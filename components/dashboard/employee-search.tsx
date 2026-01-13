'use client'

import { useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useDebouncedCallback } from '@/hooks/use-debounce'

interface EmployeeSearchProps {
  /** Current search value (controlled) */
  value: string
  /** Callback when search value changes (debounced internally) */
  onChange: (value: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Debounce delay in milliseconds */
  debounceMs?: number
}

/**
 * Search input for filtering employees by name.
 * Includes debouncing to prevent excessive filtering on every keystroke.
 */
export function EmployeeSearch({
  value,
  onChange,
  placeholder = 'Search employees...',
  debounceMs = 300,
}: EmployeeSearchProps) {
  // Local state for immediate input feedback
  const [localValue, setLocalValue] = useState(value)

  // Debounced callback for parent updates
  const debouncedOnChange = useDebouncedCallback(
    useCallback(
      (newValue: string) => {
        onChange(newValue)
      },
      [onChange]
    ),
    debounceMs
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    debouncedOnChange(newValue)
  }

  const handleClear = () => {
    setLocalValue('')
    onChange('') // Immediate clear, no debounce
  }

  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
        aria-hidden="true"
      />
      <Input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-10 pr-10 w-full sm:w-72 border-slate-200 focus:border-blue-500 focus-visible:ring-blue-500/20"
        aria-label="Search employees by name"
      />
      {localValue && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
