import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ checkServerActionRateLimit: vi.fn() }))
vi.mock('@/lib/db/employees', () => ({ createEmployee: vi.fn() }))
vi.mock('@/app/(dashboard)/settings/team/actions', () => ({ inviteTeamMember: vi.fn() }))

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { checkServerActionRateLimit } from '@/lib/rate-limit'
import { completeOnboarding, completeOnboardingForImport } from '@/app/(onboarding)/onboarding/actions'
import { ValidationError } from '@/lib/errors'

function mockSupabase(subscriptionStatus: string) {
  const profileSingle = vi.fn().mockResolvedValue({
    data: { company_id: 'company-1' },
  })
  const profileSelectEq = vi.fn().mockReturnValue({ single: profileSingle })
  const profileSelect = vi.fn().mockReturnValue({ eq: profileSelectEq })
  const profileUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const profileUpdate = vi.fn().mockReturnValue({ eq: profileUpdateEq })

  const entitlementSingle = vi.fn().mockResolvedValue({
    data: { subscription_status: subscriptionStatus },
    error: null,
  })
  const entitlementEq = vi.fn().mockReturnValue({ single: entitlementSingle })
  const entitlementSelect = vi.fn().mockReturnValue({ eq: entitlementEq })

  const from = vi.fn((table: string) => {
    if (table === 'profiles') {
      return {
        select: profileSelect,
        update: profileUpdate,
      }
    }

    if (table === 'company_entitlements') {
      return { select: entitlementSelect }
    }

    throw new Error(`Unexpected table ${table}`)
  })

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
      }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
    from,
  } as never)
}

describe('onboarding completion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(checkServerActionRateLimit).mockResolvedValue({ allowed: true } as never)
  })

  it('blocks completion when the company is not paid or trialing', async () => {
    mockSupabase('past_due')

    await expect(completeOnboarding()).rejects.toBeInstanceOf(ValidationError)

    expect(revalidatePath).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('redirects regular completion to the dashboard tour', async () => {
    mockSupabase('active')

    await completeOnboarding()

    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
    expect(redirect).toHaveBeenCalledWith('/dashboard?tour=1')
  })

  it('redirects import completion to the import workflow', async () => {
    mockSupabase('trialing')

    await completeOnboardingForImport()

    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
    expect(redirect).toHaveBeenCalledWith('/import')
  })
})
