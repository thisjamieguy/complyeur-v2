import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ checkServerActionRateLimit: vi.fn() }))
vi.mock('@/lib/db/employees', () => ({ createEmployee: vi.fn() }))
vi.mock('@/app/(dashboard)/settings/team/actions', () => ({ inviteTeamMember: vi.fn() }))

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { checkServerActionRateLimit } from '@/lib/rate-limit'
import { createEmployee } from '@/lib/db/employees'
import { addFirstEmployee } from '@/app/(onboarding)/onboarding/actions'
import { DatabaseError, ValidationError } from '@/lib/errors'

function makeFormData(name = 'Brian Herlihy', nationalityType = 'uk_citizen'): FormData {
  const fd = new FormData()
  fd.set('name', name)
  fd.set('nationalityType', nationalityType)
  return fd
}

describe('onboarding addFirstEmployee', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const profileSingle = vi.fn().mockResolvedValue({
      data: { company_id: 'company-1' },
    })
    const profileEq = vi.fn().mockReturnValue({ single: profileSingle })
    const profileSelect = vi.fn().mockReturnValue({ eq: profileEq })
    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return { select: profileSelect }
      }

      throw new Error(`Unexpected table ${table}`)
    })

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
        }),
      },
      from,
    } as never)

    vi.mocked(checkServerActionRateLimit).mockResolvedValue({
      allowed: true,
    } as never)
  })

  it('delegates employee creation to the shared createEmployee path', async () => {
    await addFirstEmployee(makeFormData())

    expect(createEmployee).toHaveBeenCalledWith({
      name: 'Brian Herlihy',
      nationality_type: 'uk_citizen',
    })
    expect(revalidatePath).toHaveBeenCalledWith('/onboarding')
  })

  it('surfaces duplicate-name validation errors from the shared create path', async () => {
    vi.mocked(createEmployee).mockRejectedValue(
      new ValidationError('An active employee named "Brian Herlihy" already exists.', 'name')
    )

    await expect(addFirstEmployee(makeFormData())).rejects.toBeInstanceOf(ValidationError)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('maps unexpected employee creation failures to DatabaseError', async () => {
    vi.mocked(createEmployee).mockRejectedValue(new Error('insert failed'))

    await expect(addFirstEmployee(makeFormData())).rejects.toBeInstanceOf(DatabaseError)
  })
})
