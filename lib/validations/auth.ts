import { z } from 'zod'

/**
 * Auth validation schemas
 *
 * Password requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */

// Password strength validation
const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .refine(
    (val) => /[A-Z]/.test(val),
    'Password must include at least one uppercase letter'
  )
  .refine(
    (val) => /[a-z]/.test(val),
    'Password must include at least one lowercase letter'
  )
  .refine(
    (val) => /[0-9]/.test(val),
    'Password must include at least one number'
  )

// Company name pattern: allows letters, numbers, spaces, common business characters
const companyNamePattern = /^[\p{L}\p{N}\s\-&.,''()]+$/u

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email must be less than 254 characters')
    .transform((val) => val.trim().toLowerCase()),
  password: z
    .string()
    .min(1, 'Password is required'),
})

export const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address')
      .max(254, 'Email must be less than 254 characters')
      .transform((val) => val.trim().toLowerCase()),
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
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
    termsAccepted: z
      .boolean()
      .refine((val) => val === true, {
        message: 'You must agree to the Terms of Service and Privacy Policy',
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email must be less than 254 characters')
    .transform((val) => val.trim().toLowerCase()),
})

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

/**
 * Get password strength feedback
 * Returns an array of requirements that are not yet met
 */
export function getPasswordStrengthFeedback(password: string): string[] {
  const feedback: string[] = []

  if (password.length < 8) {
    feedback.push('At least 8 characters')
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('One uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    feedback.push('One lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    feedback.push('One number')
  }

  return feedback
}
