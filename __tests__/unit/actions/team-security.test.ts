import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/services/team-invites', () => ({
  dispatchInviteEmail: vi.fn(),
  normalizeInviteEmail: vi.fn((email: string) => email.trim().toLowerCase()),
}))

vi.mock('@/lib/security/authorization', () => ({
  requireMutationPermission: vi.fn(),
  requireOwnerMutation: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('team management security guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects direct invite calls from users without team invite permission', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { requireMutationPermission } = await import('@/lib/security/authorization')

    vi.mocked(createClient).mockResolvedValue({} as never)
    vi.mocked(requireMutationPermission).mockResolvedValue({
      allowed: false,
      status: 403,
      error: 'Forbidden',
    })

    const { inviteTeamMember } = await import('@/app/(dashboard)/settings/team/actions')
    const result = await inviteTeamMember('viewer@example.com', 'viewer')

    expect(result).toEqual({
      success: false,
      error: 'Only owners and admins can invite users',
    })
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('surfaces privileged mutation rate limiting before any team invite write runs', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { requireMutationPermission } = await import('@/lib/security/authorization')

    vi.mocked(createClient).mockResolvedValue({} as never)
    vi.mocked(requireMutationPermission).mockResolvedValue({
      allowed: false,
      status: 429,
      error: 'Rate limit exceeded',
    })

    const { inviteTeamMember } = await import('@/app/(dashboard)/settings/team/actions')
    const result = await inviteTeamMember('viewer@example.com', 'viewer')

    expect(result).toEqual({
      success: false,
      error: 'Rate limit exceeded',
    })
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects direct ownership transfer calls from non-owners', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { requireOwnerMutation } = await import('@/lib/security/authorization')

    vi.mocked(createClient).mockResolvedValue({} as never)
    vi.mocked(requireOwnerMutation).mockResolvedValue({
      allowed: false,
      status: 403,
      error: 'Forbidden',
    })

    const { transferOwnership } = await import('@/app/(dashboard)/settings/team/actions')
    const result = await transferOwnership('new-owner-id')

    expect(result).toEqual({
      success: false,
      error: 'Only the current owner can transfer ownership',
    })
    expect(createAdminClient).not.toHaveBeenCalled()
  })
})
