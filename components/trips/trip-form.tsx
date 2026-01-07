'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { CountrySelect } from './country-select'
import {
  validateCountry,
  getCountryName,
  COUNTRY_NAMES,
} from '@/lib/constants/schengen-countries'
import type { Trip } from '@/types/database'

// Form values type (input type for the form)
export interface TripFormValues {
  country: string
  entry_date: string
  exit_date: string
  purpose?: string
  job_ref?: string
  is_private: boolean
  ghosted: boolean
}

// Form-specific schema (subset for form validation)
const tripFormSchema = z
  .object({
    country: z
      .string()
      .min(1, 'Country is required')
      .length(2, 'Country code must be 2 letters')
      .refine(
        (val) => COUNTRY_NAMES[val.toUpperCase()] !== undefined,
        'Please select a valid country'
      ),
    entry_date: z.string().min(1, 'Entry date is required'),
    exit_date: z.string().min(1, 'Exit date is required'),
    purpose: z
      .string()
      .max(500, 'Purpose must be less than 500 characters')
      .optional(),
    job_ref: z
      .string()
      .max(100, 'Job reference must be less than 100 characters')
      .optional(),
    is_private: z.boolean(),
    ghosted: z.boolean(),
  })
  .refine(
    (data) => {
      const entry = new Date(data.entry_date)
      const exit = new Date(data.exit_date)
      return exit >= entry
    },
    {
      message: 'Exit date must be on or after entry date',
      path: ['exit_date'],
    }
  )
  .refine(
    (data) => {
      const entry = new Date(data.entry_date)
      const oneYearFromNow = new Date()
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
      return entry <= oneYearFromNow
    },
    {
      message: 'Entry date cannot be more than 1 year in the future',
      path: ['entry_date'],
    }
  )

interface TripFormProps {
  onSubmit: (data: TripFormValues) => Promise<void>
  onCancel: () => void
  isLoading: boolean
  submitLabel?: string
  defaultValues?: Partial<TripFormValues>
  trip?: Trip
  error?: string | null
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

export function TripForm({
  onSubmit,
  onCancel,
  isLoading,
  submitLabel = 'Save Trip',
  defaultValues,
  trip,
  error,
}: TripFormProps) {
  const today = getTodayString()

  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      country: trip?.country || defaultValues?.country || '',
      entry_date: trip?.entry_date || defaultValues?.entry_date || today,
      exit_date: trip?.exit_date || defaultValues?.exit_date || today,
      purpose: trip?.purpose || defaultValues?.purpose || '',
      job_ref: trip?.job_ref || defaultValues?.job_ref || '',
      is_private: trip?.is_private || defaultValues?.is_private || false,
      ghosted: trip?.ghosted || defaultValues?.ghosted || false,
    },
  })

  const selectedCountry = form.watch('country')
  const countryValidation = selectedCountry
    ? validateCountry(selectedCountry)
    : null

  // Update form values when trip prop changes (for edit mode)
  useEffect(() => {
    if (trip) {
      form.reset({
        country: trip.country,
        entry_date: trip.entry_date,
        exit_date: trip.exit_date,
        purpose: trip.purpose || '',
        job_ref: trip.job_ref || '',
        is_private: trip.is_private || false,
        ghosted: trip.ghosted || false,
      })
    }
  }, [trip, form])

  async function handleSubmit(data: TripFormValues) {
    await onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <FormControl>
                <CountrySelect
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                  placeholder="Select a country..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {countryValidation?.warning && (
          <Alert className="border-amber-500 bg-amber-50 text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              {countryValidation.warning}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="entry_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entry Date</FormLabel>
                <FormControl>
                  <Input type="date" disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="exit_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Exit Date</FormLabel>
                <FormControl>
                  <Input type="date" disabled={isLoading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Purpose{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Business meeting, conference, etc."
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="job_ref"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Job Reference{' '}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="PO-12345"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 pt-2 border-t">
          <FormField
            control={form.control}
            name="is_private"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-normal">
                    Private trip
                  </FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Country will be hidden in reports (shown as "XX")
                  </p>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ghosted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm font-normal">
                    Exclude from compliance
                  </FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Trip will not count toward the 90-day limit (e.g., transit, cancelled)
                  </p>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
