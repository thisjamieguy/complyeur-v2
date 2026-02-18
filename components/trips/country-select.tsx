'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import {
  COUNTRY_LIST,
  isSchengenCountry,
  isNonSchengenEU,
} from '@/lib/constants/schengen-countries'

// Pre-partitioned at module level — runs once instead of 3x filter per render
const SCHENGEN_COUNTRIES = COUNTRY_LIST.filter((c) => isSchengenCountry(c.code))
const NON_SCHENGEN_EU_COUNTRIES = COUNTRY_LIST.filter((c) => isNonSchengenEU(c.code))
const OTHER_COUNTRIES = COUNTRY_LIST.filter(
  (c) => !isSchengenCountry(c.code) && !isNonSchengenEU(c.code)
)

interface CountrySelectProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export function CountrySelect({
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Select country...',
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedCountry = COUNTRY_LIST.find(
    (country) => country.code === value.toUpperCase()
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between overflow-hidden"
          disabled={disabled}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
              <span className="truncate">{selectedCountry.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup heading="Schengen Countries">
              {SCHENGEN_COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.code}`}
                  onSelect={() => {
                    onValueChange(country.code)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.toUpperCase() === country.code
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  <span className="flex-1">{country.name}</span>
                  <CountryBadge code={country.code} />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="EU (Non-Schengen)">
              {NON_SCHENGEN_EU_COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.code}`}
                  onSelect={() => {
                    onValueChange(country.code)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.toUpperCase() === country.code
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  <span className="flex-1">{country.name}</span>
                  <CountryBadge code={country.code} />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Other Countries">
              {OTHER_COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.code}`}
                  onSelect={() => {
                    onValueChange(country.code)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.toUpperCase() === country.code
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  <span className="flex-1">{country.name}</span>
                  <CountryBadge code={country.code} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function CountryBadge({ code }: { code: string }) {
  if (isSchengenCountry(code)) {
    return (
      <Badge variant="default" className="ml-2 bg-blue-600 text-xs">
        Schengen
      </Badge>
    )
  }
  if (isNonSchengenEU(code)) {
    return (
      <Badge variant="secondary" className="ml-2 text-xs">
        EU (non-Schengen)
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="ml-2 text-xs">
      Non-Schengen
    </Badge>
  )
}
