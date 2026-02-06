import { createClient } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import type { FeedbackSubmissionInput } from '@/types/database-helpers'

type CreateFeedbackInput = Pick<FeedbackSubmissionInput, 'category' | 'message' | 'page_path'>

/**
 * Create a feedback submission tied to the authenticated user and company.
 */
export async function createFeedbackSubmission(
  input: CreateFeedbackInput
): Promise<void> {
  const supabase = await createClient()
  const { companyId, userId } = await requireCompanyAccess(supabase)

  const { error } = await supabase
    .from('feedback_submissions')
    .insert({
      company_id: companyId,
      user_id: userId,
      category: input.category,
      message: input.message,
      page_path: input.page_path,
    })

  if (error) {
    console.error('Error creating feedback submission:', error)
    throw new DatabaseError('Failed to submit feedback')
  }
}
