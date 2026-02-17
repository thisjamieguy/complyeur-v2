import { z } from 'zod'

const companyNamePattern = /^[\p{L}\p{N}\s\-&.,''()]+$/u

export const companyNameSchema = z.object({
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be less than 100 characters')
    .trim()
    .refine(
      (val) => companyNamePattern.test(val),
      'Company name contains invalid characters'
    ),
})

export const addEmployeeSchema = z.object({
  name: z
    .string()
    .min(1, 'Employee name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  nationalityType: z.enum(['uk_citizen', 'eu_schengen_citizen', 'rest_of_world'], {
    message: 'Please select a nationality type',
  }),
})

export const inviteTeamSchema = z.object({
  emails: z
    .array(
      z
        .string()
        .email('Please enter a valid email address')
        .max(254, 'Email must be less than 254 characters')
        .transform((val) => val.trim().toLowerCase())
        .or(z.literal(''))
    )
    .max(3),
})

export type CompanyNameInput = z.infer<typeof companyNameSchema>
export type AddEmployeeInput = z.infer<typeof addEmployeeSchema>
export type InviteTeamInput = z.infer<typeof inviteTeamSchema>
