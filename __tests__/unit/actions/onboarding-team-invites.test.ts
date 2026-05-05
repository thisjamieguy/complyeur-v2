/**
 * Unit tests for the onboarding inviteTeamMembers server action.
 *
 * This action is a thin onboarding wrapper around the secure dashboard
 * inviteTeamMember action:
 * - Batch-processes up to 3 emails from FormData
 * - Throws errors (does not return ActionResult)
 * - Silently skips duplicate and self-invite emails (continues the loop)
 * - Assigns "manager" role by default
 * - Reuses the dashboard invite action for permissions, seat limits, and audit logging
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/app/(dashboard)/settings/team/actions', () => ({ inviteTeamMember: vi.fn() }))

import { revalidatePath } from 'next/cache'
import { inviteTeamMember } from '@/app/(dashboard)/settings/team/actions'
import { inviteTeamMembers } from '@/app/(onboarding)/onboarding/actions'
import { ValidationError } from '@/lib/errors'

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
  vi.mocked(inviteTeamMember).mockResolvedValue({ success: true })
})

// ─── Early returns ────────────────────────────────────────────────────────────

describe('early return behaviour', () => {
  it('returns without creating any invite when all email fields are empty', async () => {
    const fd = makeFormData(['', '', ''])
    await inviteTeamMembers(fd)
    expect(inviteTeamMember).not.toHaveBeenCalled()
  })

  it('returns without creating any invite when no email fields are present', async () => {
    const fd = new FormData() // no email0/1/2 keys at all
    await inviteTeamMembers(fd)
    expect(inviteTeamMember).not.toHaveBeenCalled()
  })

  it('returns without creating any invite when all emails equal the actor email (self)', async () => {
    const fd = makeFormData(['owner@company.com', 'OWNER@COMPANY.COM', ''])
    vi.mocked(inviteTeamMember).mockResolvedValue({ success: false, error: 'You cannot invite yourself' })
    await inviteTeamMembers(fd)
    expect(inviteTeamMember).toHaveBeenCalledTimes(2)
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
  it('throws when dashboard invite action rejects the caller as unauthenticated', async () => {
    vi.mocked(inviteTeamMember).mockResolvedValue({ success: false, error: 'Not authenticated' })
    const fd = makeFormData(['user@test.com', '', ''])
    await expect(inviteTeamMembers(fd)).rejects.toThrow('Not authenticated')
  })

  it('throws when dashboard invite action rejects the caller as unauthorized', async () => {
    vi.mocked(inviteTeamMember).mockResolvedValue({
      success: false,
      error: 'Only owners and admins can invite users',
    })
    const fd = makeFormData(['user@test.com', '', ''])
    await expect(inviteTeamMembers(fd)).rejects.toThrow('Only owners and admins can invite users')
  })

  it('throws when dashboard invite action hits a rate limit', async () => {
    vi.mocked(inviteTeamMember).mockResolvedValue({ success: false, error: 'Too many requests' })
    const fd = makeFormData(['user@test.com', '', ''])
    await expect(inviteTeamMembers(fd)).rejects.toThrow('Too many requests')
  })
})

// ─── Silent skip behaviours ───────────────────────────────────────────────────

describe('silent skip behaviour', () => {
  it('skips an email that matches the actor email (case-insensitive)', async () => {
    vi.mocked(inviteTeamMember)
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'You cannot invite yourself' })

    const fd = makeFormData(['other@company.com', 'OWNER@COMPANY.COM', ''])
    await inviteTeamMembers(fd)

    expect(inviteTeamMember).toHaveBeenCalledTimes(2)
  })

  it('skips a duplicate invite without throwing', async () => {
    vi.mocked(inviteTeamMember)
      .mockResolvedValueOnce({ success: false, error: 'An active invite already exists for this email.' })
      .mockResolvedValueOnce({ success: true })

    const fd = makeFormData(['existing@company.com', 'new@company.com', ''])

    await expect(inviteTeamMembers(fd)).resolves.toBeUndefined()
    expect(inviteTeamMember).toHaveBeenCalledTimes(2)
  })

  it('throws when the reused dashboard invite flow returns a non-skippable failure', async () => {
    vi.mocked(inviteTeamMember).mockResolvedValue({ success: false, error: 'User limit reached for current tier' })
    const fd = makeFormData(['existing@company.com', '', ''])
    await expect(inviteTeamMembers(fd)).rejects.toThrow('User limit reached for current tier')
  })
})

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('successful invites', () => {
  it('reuses the dashboard invite action for a single valid email', async () => {
    const fd = makeFormData(['new@company.com', '', ''])
    await inviteTeamMembers(fd)

    expect(inviteTeamMember).toHaveBeenCalledWith('new@company.com', 'manager', {
      redirectPath: '/onboarding',
      revalidateTarget: '/onboarding',
    })
  })

  it('calls the dashboard invite action once per valid onboarding email', async () => {
    const fd = makeFormData(['a@company.com', 'b@company.com', 'c@company.com'])
    await inviteTeamMembers(fd)

    expect(inviteTeamMember).toHaveBeenCalledTimes(3)
  })

  it('assigns the "manager" role to all onboarding invites', async () => {
    const fd = makeFormData(['new@company.com', '', ''])
    await inviteTeamMembers(fd)

    expect(inviteTeamMember).toHaveBeenCalledWith('new@company.com', 'manager', expect.any(Object))
  })

  it('passes the original onboarding email through to the shared invite action', async () => {
    const fd = makeFormData(['NEW@COMPANY.COM', '', ''])
    await inviteTeamMembers(fd)

    expect(inviteTeamMember).toHaveBeenCalledWith('new@company.com', 'manager', expect.any(Object))
  })

  it('calls revalidatePath after processing', async () => {
    const fd = makeFormData(['new@company.com', '', ''])
    await inviteTeamMembers(fd)

    expect(revalidatePath).toHaveBeenCalledWith('/onboarding')
  })
})
