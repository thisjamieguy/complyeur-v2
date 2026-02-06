import { z } from 'zod'

export const feedbackCategorySchema = z.enum([
  'bug',
  'feature_request',
  'confusing_ux',
  'other',
])

export const feedbackSubmissionSchema = z.object({
  category: feedbackCategorySchema,
  message: z
    .string()
    .trim()
    .min(10, 'Please add at least 10 characters')
    .max(2000, 'Feedback must be 2000 characters or less'),
  page_path: z
    .string()
    .trim()
    .min(1, 'Page path is required')
    .max(500, 'Page path is too long')
    .refine((value) => value.startsWith('/'), 'Page path must start with /'),
})

export type FeedbackSubmissionFormData = z.infer<typeof feedbackSubmissionSchema>
