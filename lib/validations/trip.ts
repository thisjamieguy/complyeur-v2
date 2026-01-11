import { z } from 'zod'
import { validateCountry, COUNTRY_NAMES } from '@/lib/constants/schengen-countries'
import {
  isValidISODate,
  isDateTooFarInPast,
  isDateTooFarInFuture,
  getTripDurationDays,
} from './dates'

/**
 * Trip validation schema and helpers
 *
 * Validates:
 * - Country code (2 letters, known country)
 * - Entry date (required, valid date, not more than 180 days in the past)
 * - Exit date (required, valid date, must be >= entry_date, not more than 30 days in future)
 * - Trip duration cannot exceed 180 days (warning issued for >90 days)
 * - Optional fields (purpose, job_ref)
 */

// Date string validation helper
const dateStringSchema = z
  .string()
  .min(1, 'Date is required')
  .refine((val) => isValidISODate(val), 'Please enter a valid date')

// Base schema for trip form data
export const tripSchema = z
  .object({
    employee_id: z.string().uuid('Invalid employee ID'),
    country: z
      .string()
      .min(1, 'Country is required')
      .length(2, 'Country code must be 2 letters')
      .transform((val) => val.toUpperCase())
      .refine(
        (val) => COUNTRY_NAMES[val] !== undefined,
        'Please select a valid country'
      ),
    entry_date: dateStringSchema,
    exit_date: dateStringSchema,
    purpose: z
      .string()
      .max(500, 'Purpose must be less than 500 characters')
      .optional()
      .transform((val) => val?.trim() || null),
    job_ref: z
      .string()
      .max(100, 'Job reference must be less than 100 characters')
      .optional()
      .transform((val) => val?.trim() || null),
    is_private: z.boolean().optional().default(false),
    ghosted: z.boolean().optional().default(false),
  })
  // Validate entry date is not too far in the past (180 days max)
  .refine(
    (data) => {
      const entry = new Date(data.entry_date)
      return !isDateTooFarInPast(entry, 180)
    },
    {
      message: 'Entry date cannot be more than 180 days in the past',
      path: ['entry_date'],
    }
  )
  // Validate exit date is not too far in the future (30 days max)
  .refine(
    (data) => {
      const exit = new Date(data.exit_date)
      return !isDateTooFarInFuture(exit, 30)
    },
    {
      message: 'Exit date cannot be more than 30 days in the future',
      path: ['exit_date'],
    }
  )
  // Validate exit date is on or after entry date
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
  // Validate trip duration does not exceed 180 days
  .refine(
    (data) => {
      const entry = new Date(data.entry_date)
      const exit = new Date(data.exit_date)
      const duration = getTripDurationDays(entry, exit)
      return duration <= 180
    },
    {
      message: 'Trip duration cannot exceed 180 days',
      path: ['exit_date'],
    }
  )

export type TripFormData = z.infer<typeof tripSchema>

// Optional date string for updates
const optionalDateStringSchema = z
  .string()
  .refine((val) => !val || isValidISODate(val), 'Please enter a valid date')
  .optional()

// Schema for updating a trip (all fields optional except dates validation)
export const tripUpdateSchema = z
  .object({
    country: z
      .string()
      .length(2, 'Country code must be 2 letters')
      .transform((val) => val.toUpperCase())
      .refine(
        (val) => COUNTRY_NAMES[val] !== undefined,
        'Please select a valid country'
      )
      .optional(),
    entry_date: optionalDateStringSchema,
    exit_date: optionalDateStringSchema,
    purpose: z
      .string()
      .max(500, 'Purpose must be less than 500 characters')
      .optional()
      .nullable()
      .transform((val) => val?.trim() || null),
    job_ref: z
      .string()
      .max(100, 'Job reference must be less than 100 characters')
      .optional()
      .nullable()
      .transform((val) => val?.trim() || null),
    is_private: z.boolean().optional(),
    ghosted: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.entry_date && data.exit_date) {
        const entry = new Date(data.entry_date)
        const exit = new Date(data.exit_date)
        return exit >= entry
      }
      return true
    },
    {
      message: 'Exit date must be on or after entry date',
      path: ['exit_date'],
    }
  )
  .refine(
    (data) => {
      if (data.entry_date && data.exit_date) {
        const entry = new Date(data.entry_date)
        const exit = new Date(data.exit_date)
        const duration = getTripDurationDays(entry, exit)
        return duration <= 180
      }
      return true
    },
    {
      message: 'Trip duration cannot exceed 180 days',
      path: ['exit_date'],
    }
  )

export type TripUpdateData = z.infer<typeof tripUpdateSchema>

/**
 * Trip overlap detection
 */
export interface Trip {
  id: string
  entry_date: string
  exit_date: string
}

export interface OverlapResult {
  hasOverlap: boolean
  overlappingTrip: Trip | null
  message: string | null
}

/**
 * Check if a date range overlaps with any existing trips
 *
 * @param newEntryDate - Start date of new/updated trip
 * @param newExitDate - End date of new/updated trip
 * @param existingTrips - List of existing trips to check against
 * @param excludeTripId - Trip ID to exclude (for edit operations)
 */
export function checkTripOverlap(
  newEntryDate: string,
  newExitDate: string,
  existingTrips: Trip[],
  excludeTripId?: string
): OverlapResult {
  const newEntry = new Date(newEntryDate)
  const newExit = new Date(newExitDate)

  const overlappingTrip = existingTrips.find((trip) => {
    // Skip the trip being edited
    if (excludeTripId && trip.id === excludeTripId) {
      return false
    }

    const tripStart = new Date(trip.entry_date)
    const tripEnd = new Date(trip.exit_date)

    // Overlap exists if: newEntry <= tripEnd AND newExit >= tripStart
    return newEntry <= tripEnd && newExit >= tripStart
  })

  if (overlappingTrip) {
    const start = formatDate(overlappingTrip.entry_date)
    const end = formatDate(overlappingTrip.exit_date)
    return {
      hasOverlap: true,
      overlappingTrip,
      message: `Trip overlaps with existing trip (${start} - ${end}). Please adjust dates.`,
    }
  }

  return {
    hasOverlap: false,
    overlappingTrip: null,
    message: null,
  }
}

/**
 * Calculate travel days (inclusive of both entry and exit dates)
 */
export function calculateTravelDays(entryDate: string, exitDate: string): number {
  const entry = new Date(entryDate)
  const exit = new Date(exitDate)
  const diffTime = Math.abs(exit.getTime() - entry.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays + 1 // Add 1 because both dates count
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Get country validation with Schengen status
 */
export function getCountryValidation(countryCode: string) {
  return validateCountry(countryCode)
}
