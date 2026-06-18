import type { SupabaseClient } from '@supabase/supabase-js'

interface CompanyEmailRecipient {
  email: string | null
  role: string | null
}

interface PrimaryCompanyRecipientResult {
  email: string | null
  error?: string
}

const ROLE_PRIORITY = ['owner', 'admin', 'manager', 'viewer']

function getRolePriority(role: string | null): number {
  const index = ROLE_PRIORITY.indexOf(role ?? '')
  return index === -1 ? ROLE_PRIORITY.length : index
}

export async function getPrimaryCompanyRecipientEmail(
  admin: SupabaseClient,
  companyId: string
): Promise<PrimaryCompanyRecipientResult> {
  const { data, error } = await admin
    .from('profiles')
    .select('email, role')
    .eq('company_id', companyId)
    .not('email', 'is', null)

  if (error) {
    return { email: null, error: error.message }
  }

  const recipients = ((data ?? []) as CompanyEmailRecipient[])
    .map((recipient) => ({
      email: recipient.email?.trim().toLowerCase() ?? '',
      role: recipient.role,
    }))
    .filter((recipient) => recipient.email.includes('@'))
    .sort((left, right) => getRolePriority(left.role) - getRolePriority(right.role))

  return { email: recipients[0]?.email ?? null }
}
