import { describe, expect, it } from 'vitest'
import { feedbackSubmissionSchema } from '@/lib/validations/feedback'

const validPayload = {
  category: 'bug' as const,
  message: 'The calendar filter resets when I switch months.',
  page_path: '/calendar',
}

describe('feedbackSubmissionSchema', () => {
  it('accepts valid payload', () => {
    const result = feedbackSubmissionSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('rejects invalid category', () => {
    const result = feedbackSubmissionSchema.safeParse({
      ...validPayload,
      category: 'billing_issue',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty or short feedback message', () => {
    const result = feedbackSubmissionSchema.safeParse({
      ...validPayload,
      message: 'Too short',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid page path', () => {
    const result = feedbackSubmissionSchema.safeParse({
      ...validPayload,
      page_path: 'calendar',
    })
    expect(result.success).toBe(false)
  })
})
