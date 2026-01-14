import { z } from 'zod'

/**
 * Employee validation schema
 *
 * Current database structure only supports 'name' field.
 * Enhanced fields (email, department, nationality) are available
 * in the extended schema for future database migrations.
 *
 * Validates:
 * - Name: Required, 2-100 characters, letters/spaces/hyphens/apostrophes only
 */

// Name pattern: allows letters (including accented), spaces, hyphens, apostrophes, periods
const namePattern = /^[\p{L}\s\-'.]+$/u

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
})

export type EmployeeFormData = z.infer<typeof employeeSchema>

/**
 * Schema for updating an employee (name optional for partial updates)
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
})

export type EmployeeUpdateData = z.infer<typeof employeeUpdateSchema>

/**
 * Extended employee schema (for future use when database is updated)
 * These fields would require a database migration to add:
 * - email: optional email field
 * - department: optional department field
 * - nationality: optional 2-letter country code
 */
// import { COUNTRY_NAMES } from '@/lib/constants/schengen-countries'
// export const employeeExtendedSchema = z.object({
//   name: employeeSchema.shape.name,
//   email: z.string().email().max(254).optional().nullable(),
//   department: z.string().max(50).optional().nullable(),
//   nationality: z.string().length(2).optional().nullable(),
// })
