import { z } from 'zod'
import { COUNTRY_NAMES } from '@/lib/constants/schengen-countries'
import { parseDateOnlyAsUTC } from '@/lib/compliance/date-utils'
import {
  getTripDurationDays,
  isDateTooFarInPast,
  isValidISODate,
} from './dates'

const dateStringSchema = z
  .string()
  .min(1, 'Date is required')
  .refine((value) => isValidISODate(value), 'Please enter a valid date')

const countrySchema = z
  .string()
  .min(1, 'Country is required')
  .length(2, 'Country code must be 2 letters')
  .transform((value) => value.toUpperCase())
  .refine(
    (value) => COUNTRY_NAMES[value] !== undefined,
    'Please select a valid country'
  )

function validateDateRange(data: {
  entry_date: string
  exit_date: string
}): boolean {
  const entry = parseDateOnlyAsUTC(data.entry_date)
  const exit = parseDateOnlyAsUTC(data.exit_date)
  return exit >= entry
}

function validateDuration(data: {
  entry_date: string
  exit_date: string
}): boolean {
  const entry = parseDateOnlyAsUTC(data.entry_date)
  const exit = parseDateOnlyAsUTC(data.exit_date)
  return getTripDurationDays(entry, exit) <= 180
}

function validatePastLimit(data: { entry_date: string }): boolean {
  return !isDateTooFarInPast(parseDateOnlyAsUTC(data.entry_date), 180)
}

const jobDateRules = <T extends z.ZodTypeAny>(schema: T) =>
  schema
    .refine((data) => validatePastLimit(data as { entry_date: string }), {
      message: 'Entry date cannot be more than 180 days in the past',
      path: ['entry_date'],
    })
    .refine(
      (data) =>
        validateDateRange(data as { entry_date: string; exit_date: string }),
      {
        message: 'Exit date must be on or after entry date',
        path: ['exit_date'],
      }
    )
    .refine(
      (data) =>
        validateDuration(data as { entry_date: string; exit_date: string }),
      {
        message: 'Trip duration cannot exceed 180 days',
        path: ['exit_date'],
      }
    )

export const jobEmployeeTripSchema = jobDateRules(
  z.object({
    employee_id: z.string().uuid('Invalid employee ID'),
    country: countrySchema,
    entry_date: dateStringSchema,
    exit_date: dateStringSchema,
  })
)

export const jobCreateSchema = jobDateRules(
  z.object({
    job_ref: z
      .string()
      .trim()
      .min(1, 'Job reference is required')
      .max(100, 'Job reference must be less than 100 characters'),
    customer: z
      .string()
      .trim()
      .min(1, 'Customer is required')
      .max(200, 'Customer must be less than 200 characters'),
    country: countrySchema,
    entry_date: dateStringSchema,
    exit_date: dateStringSchema,
    purpose: z
      .string()
      .max(500, 'Purpose must be less than 500 characters')
      .optional()
      .transform((value) => value?.trim() || null),
    employees: z
      .array(jobEmployeeTripSchema)
      .min(1, 'Add at least one employee')
      .max(50, 'Maximum 50 employees per job'),
  })
).superRefine((data, context) => {
  const seen = new Set<string>()
  data.employees.forEach((employee, index) => {
    if (seen.has(employee.employee_id)) {
      context.addIssue({
        code: 'custom',
        message: 'Employee is already added to this job',
        path: ['employees', index, 'employee_id'],
      })
      return
    }
    seen.add(employee.employee_id)
  })
})

export const jobUpdateSchema = jobDateRules(
  z.object({
    job_ref: z
      .string()
      .trim()
      .min(1, 'Job reference is required')
      .max(100, 'Job reference must be less than 100 characters'),
    customer: z
      .string()
      .trim()
      .min(1, 'Customer is required')
      .max(200, 'Customer must be less than 200 characters'),
    country: countrySchema,
    entry_date: dateStringSchema,
    exit_date: dateStringSchema,
    purpose: z
      .string()
      .max(500, 'Purpose must be less than 500 characters')
      .optional()
      .nullable()
      .transform((value) => value?.trim() || null),
    applyToTrips: z.boolean(),
  })
)

export const jobTripUpdateSchema = jobDateRules(
  z.object({
    country: countrySchema,
    entry_date: dateStringSchema,
    exit_date: dateStringSchema,
  })
)

export type JobCreateData = z.infer<typeof jobCreateSchema>
export type JobUpdateData = z.infer<typeof jobUpdateSchema>
export type JobEmployeeTripData = z.infer<typeof jobEmployeeTripSchema>
export type JobTripUpdateData = z.infer<typeof jobTripUpdateSchema>
