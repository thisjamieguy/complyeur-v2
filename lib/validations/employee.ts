import { z } from 'zod'

/**
 * Employee validation schema
 *
 * Validates:
 * - Name: Required, 2-100 characters, letters/spaces/hyphens/apostrophes only
 * - Nationality type: Optional, defaults to 'uk_citizen'
 */

// Name pattern: allows letters (including accented), spaces, hyphens, apostrophes, periods
const namePattern = /^[\p{L}\s\-'.]+$/u

const nationalityTypeEnum = z.enum(['uk_citizen', 'eu_schengen_citizen', 'rest_of_world'])

/**
 * Base employee schema (matches current database structure)
 */
export const employeeSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .refine(
      (val) => namePattern.test(val),
      'Name can only contain letters, spaces, hyphens, apostrophes, and periods'
    ),
  nationality_type: nationalityTypeEnum,
})

export type EmployeeFormData = z.infer<typeof employeeSchema>

/**
 * Schema for updating an employee (all fields optional for partial updates)
 */
export const employeeUpdateSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .refine(
      (val) => namePattern.test(val),
      'Name can only contain letters, spaces, hyphens, apostrophes, and periods'
    )
    .optional(),
  nationality_type: nationalityTypeEnum.optional(),
})

export type EmployeeUpdateData = z.infer<typeof employeeUpdateSchema>

/**
 * Trip entry within the unified add-employee form.
 * All fields optional so users can leave the trips section empty.
 * Validated more strictly when trips are actually provided.
 */
const tripEntrySchema = z.object({
  entry_date: z.string().optional(),
  exit_date: z.string().optional(),
  country: z.string().optional(),
  is_private: z.boolean().optional(),
})

/**
 * Combined schema for adding an employee with optional trips.
 * Used by the unified add-employee dialog.
 */
export const employeeWithTripsSchema = z.object({
  name: employeeSchema.shape.name,
  nationality_type: nationalityTypeEnum,
  trips: z.array(tripEntrySchema).optional(),
})

export type EmployeeWithTripsFormData = z.infer<typeof employeeWithTripsSchema>
