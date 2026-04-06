/**
 * Unit tests for the onboarding inviteTeamMembers server action.
 *
 * This action is distinct from the settings-page inviteTeamMember:
 * - Batch-processes up to 3 emails from FormData
 * - Throws errors (does not return ActionResult)
 * - Silently skips duplicate and self-invite emails (continues the loop)
 * - Assigns "manager" role by default
 * - Reverts a failed invite record but continues processing remaining emails
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/services/team-invites', () => ({
  dispatchInviteEmail: vi.fn(),
  normalizeInviteEmail: vi.fn((e: string) => e.trim().toLowerCase()),
}))
vi.mock('@/lib/rate-limit', () => ({ checkServerActionRateLimit: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchInviteEmail } from '@/lib/services/team-invites'
import { checkServerActionRateLimit } from '@/lib/rate-limit'
import { revalidatePath } from 'next/cache'
import { inviteTeamMembers } from '@/app/(onboarding)/onboarding/actions'
import { ValidationError } from '@/lib/errors'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChain(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {}
  for (const m of ['select', 'insert', 'update', 'eq', 'order', 'limit']) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.single = vi.fn().mockResolvedValue(result)
  chain.then = (
    resolve: (v: typeof result) => unknown,
    reject?: (e: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject)
  return chain
}

function makeSupabaseClient(
  user: { id: string; email: string } | null = { id: 'owner-id', email: 'owner@company.com' },
  profile: { company_id: string } | null = { company_id: 'company-1' }
) {
  const profileChain = makeChain({ data: profile, error: profile ? null : { message: 'Not found' } })
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn().mockReturnValue(profileChain),
  }
}

function makeAdmin(
  fromSeq: Array<{ data?: unknown; error?: unknown }> = []
) {
  let i = 0
  return {
    from: vi.fn().mockImplementation(() => makeChain(fromSeq[i++] ?? { data: null, error: null })),
    rpc: vi.fn(),
  }
}

function makeFormData(emails: Array<string | null> = []): FormData {
  const fd = new FormData()
  for (let i = 0; i < 3; i++) {
    fd.set(`email${i}`, emails[i] ?? '')
  }
  return fd
}

// ─── Global setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createClient).mockResolvedValue(makeSupabaseClient() as never)
  vi.mocked(checkServerActionRateLimit).mockResolvedValue({ allowed: true })
  vi.mocked(dispatchInviteEmail).mockResolvedValue({ success: true, recoverableExistingUser: false })
})

// ─── Early returns ────────────────────────────────────────────────────────────

describe('early return behaviour', () => {
  it('returns without creating any invite when all email fields are empty', async () => {
    const fd = makeFormData(['', '', ''])
    await inviteTeamMembers(fd)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('returns without creating any invite when no email fields are present', async () => {
    const fd = new FormData() // no email0/1/2 keys at all
    await inviteTeamMembers(fd)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('returns without creating any invite when all emails equal the actor email (self)', async () => {
    const fd = makeFormData(['owner@company.com', 'OWNER@COMPANY.COM', ''])
    const admin = makeAdmin()
    vi.mocked(createAdminClient).mockReturnValue(admin as never)
    await inviteTeamMembers(fd)
    expect(admin.from).not.toHaveBeenCalled()
  })
})

// ─── Validation ───────────────────────────────────────────────────────────────

describe('email validation', () => {
  it('throws ValidationError for an invalid email format', async () => {
    const fd = makeFormData(['not-an-email', '', ''])
    await expect(inviteTeamMembers(fd)).rejects.toBeInstanceOf(ValidationError)
  })

  it('throws ValidationError — Zod union reports "Invalid input" for bad email', async () => {
    // The schema uses z.string().email().or(z.literal('')); a union failure
    // surfaces as "Invalid input" rather than the per-branch message.
    const fd = makeFormData(['notvalid', '', ''])
    await expect(inviteTeamMembers(fd)).rejects.toThrow('Invalid input')
  })
})

// ─── Auth / rate limiting ─────────────────────────────────────────────────────

describe('authentication and rate limiting', () => {
  it('throws when user is not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient(null) as never)
    const fd = makeFormData(['user@test.com', '', ''])
    await expect(inviteTeamMembers(fd)).rejects.toThrow('Not authenticated')
  })

  it('throws when profile has no company', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseClient({ id: 'u1', email: 'x@x.com' }, null) as never)
    const fd = makeFormData(['user@test.com', '', ''])
    await expect(inviteTeamMembers(fd)).rejects.toThrow('No company found')
  })

  it('throws when rate limit is exceeded', async () => {
    vi.mocked(checkServerActionRateLimit).mockResolvedValue({ allowed: false, error: 'Too many requests' })
    const fd = makeFormData(['user@test.com', '', ''])
    await expect(inviteTeamMembers(fd)).rejects.toThrow('Too many requests')
  })
})

// ─── Silent skip behaviours ───────────────────────────────────────────────────

describe('silent skip behaviour', () => {
  it('skips an email that matches the actor email (case-insensitive)', async () => {
    const admin = makeAdmin([
      { data: { id: 'inv-1' }, error: null }, // first valid email
    ])
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    const fd = makeFormData(['other@company.com', 'OWNER@COMPANY.COM', ''])
    await inviteTeamMembers(fd)

    // Only one insert should have been attempted (the non-self email)
    expect(admin.from).toHaveBeenCalledTimes(1)
  })

  it('skips a duplicate invite without throwing (unique constraint code 23505)', async () => {
    const admin = makeAdmin([
      { data: null, error: { message: 'duplicate key', code: '23505' } },
      { data: { id: 'inv-2' }, error: null }, // second email succeeds
    ])
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    const fd = makeFormData(['existing@company.com', 'new@company.com', ''])

    // Should not throw even though first insert fails with duplicate
    await expect(inviteTeamMembers(fd)).resolves.toBeUndefined()
    expect(admin.from).toHaveBeenCalledTimes(2)
  })

  it('skips a duplicate invite when error message contains "duplicate"', async () => {
    const admin = makeAdmin([
      { data: null, error: { message: 'duplicate entry' } },
    ])
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    const fd = makeFormData(['existing@company.com', '', ''])
    await expect(inviteTeamMembers(fd)).resolves.toBeUndefined()
  })
})

// ─── Email dispatch failure ───────────────────────────────────────────────────

describe('email dispatch failure handling', () => {
  it('revokes the invite record when email dispatch fails', async () => {
    const admin = makeAdmin([
      { data: { id: 'inv-failed' }, error: null }, // insert
      { data: null, error: null },                  // revoke
    ])
    vi.mocked(createAdminClient).mockReturnValue(admin as never)
    vi.mocked(dispatchInviteEmail).mockResolvedValue({
      success: false,
      recoverableExistingUser: false,
      error: 'SMTP timeout',
    })

    const fd = makeFormData(['new@company.com', '', ''])
    await inviteTeamMembers(fd)

    // Two from() calls: insert + revoke
    expect(admin.from).toHaveBeenCalledTimes(2)
  })

  it('continues processing remaining emails after a dispatch failure', async () => {
    const admin = makeAdmin([
      { data: { id: 'inv-1' }, error: null }, // insert for first email
      { data: null, error: null },             // revoke for first email
      { data: { id: 'inv-2' }, error: null }, // insert for second email
    ])
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    vi.mocked(dispatchInviteEmail)
      .mockResolvedValueOnce({ success: false, recoverableExistingUser: false, error: 'SMTP error' })
      .mockResolvedValueOnce({ success: true, recoverableExistingUser: false })

    const fd = makeFormData(['failed@company.com', 'success@company.com', ''])
    await inviteTeamMembers(fd)

    expect(dispatchInviteEmail).toHaveBeenCalledTimes(2)
    expect(admin.from).toHaveBeenCalledTimes(3) // insert, revoke, insert
  })
})

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('successful invites', () => {
  it('creates an invite record for a single valid email', async () => {
    const admin = makeAdmin([{ data: { id: 'inv-1' }, error: null }])
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    const fd = makeFormData(['new@company.com', '', ''])
    await inviteTeamMembers(fd)

    expect(admin.from).toHaveBeenCalledTimes(1)
    expect(dispatchInviteEmail).toHaveBeenCalledTimes(1)
  })

  it('creates invite records for up to 3 valid emails', async () => {
    const admin = makeAdmin([
      { data: { id: 'inv-1' }, error: null },
      { data: { id: 'inv-2' }, error: null },
      { data: { id: 'inv-3' }, error: null },
    ])
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    const fd = makeFormData(['a@company.com', 'b@company.com', 'c@company.com'])
    await inviteTeamMembers(fd)

    expect(admin.from).toHaveBeenCalledTimes(3)
    expect(dispatchInviteEmail).toHaveBeenCalledTimes(3)
  })

  it('assigns the "manager" role to all onboarding invites', async () => {
    const admin = makeAdmin([{ data: { id: 'inv-1' }, error: null }])
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    const fd = makeFormData(['new@company.com', '', ''])
    await inviteTeamMembers(fd)

    const chain = (admin.from as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'manager' })
    )
  })

  it('normalises email to lowercase before inserting', async () => {
    const admin = makeAdmin([{ data: { id: 'inv-1' }, error: null }])
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    const fd = makeFormData(['NEW@COMPANY.COM', '', ''])
    await inviteTeamMembers(fd)

    const chain = (admin.from as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@company.com' })
    )
  })

  it('dispatches invite email to the normalised address', async () => {
    const admin = makeAdmin([{ data: { id: 'inv-1' }, error: null }])
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    // No surrounding spaces — spaces would fail Zod's .email() before the .transform()
    const fd = makeFormData(['NEW@COMPANY.COM', '', ''])
    await inviteTeamMembers(fd)

    expect(dispatchInviteEmail).toHaveBeenCalledWith(
      admin,
      'new@company.com',
      '/onboarding'
    )
  })

  it('calls revalidatePath after processing', async () => {
    const admin = makeAdmin([{ data: { id: 'inv-1' }, error: null }])
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    const fd = makeFormData(['new@company.com', '', ''])
    await inviteTeamMembers(fd)

    expect(revalidatePath).toHaveBeenCalledWith('/onboarding')
  })
})
