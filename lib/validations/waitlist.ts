import { z } from 'zod'

/**
 * Waitlist validation schema
 * Used for landing page email signup
 */

// Company name pattern: allows letters, numbers, spaces, common business characters
const companyNamePattern = /^[\p{L}\p{N}\s\-&.,''()]+$/u

export const waitlistSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email must be less than 254 characters')
    .transform((val) => val.trim().toLowerCase()),
  companyName: z
    .string()
    .max(100, 'Company name must be less than 100 characters')
    .transform((val) => val.trim())
    .refine(
      (val) => val === '' || companyNamePattern.test(val),
      'Company name contains invalid characters'
    )
    .optional()
    .or(z.literal('')),
})

export type WaitlistInput = z.infer<typeof waitlistSchema>
