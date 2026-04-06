import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  normalizeInviteEmail,
  isRecoverableInviteError,
  dispatchInviteEmail,
} from '@/lib/services/team-invites'

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_APP_URL: 'https://app.complyeur.com',
  },
}))

// ─── normalizeInviteEmail ────────────────────────────────────────────────────

describe('normalizeInviteEmail', () => {
  it('lowercases uppercase email', () => {
    expect(normalizeInviteEmail('OWNER@COMPANY.COM')).toBe('owner@company.com')
  })

  it('trims leading whitespace', () => {
    expect(normalizeInviteEmail('  user@example.com')).toBe('user@example.com')
  })

  it('trims trailing whitespace', () => {
    expect(normalizeInviteEmail('user@example.com  ')).toBe('user@example.com')
  })

  it('handles combined uppercase and surrounding whitespace', () => {
    expect(normalizeInviteEmail('  ADMIN@COMPANY.CO.UK  ')).toBe('admin@company.co.uk')
  })

  it('preserves already-normalised email unchanged', () => {
    expect(normalizeInviteEmail('user@example.com')).toBe('user@example.com')
  })

  it('handles empty string without throwing', () => {
    expect(normalizeInviteEmail('')).toBe('')
  })

  it('handles mixed-case local-part and domain', () => {
    expect(normalizeInviteEmail('John.DOE@Company.COM')).toBe('john.doe@company.com')
  })
})

// ─── isRecoverableInviteError ─────────────────────────────────────────────────

describe('isRecoverableInviteError', () => {
  it('matches "already been registered"', () => {
    expect(isRecoverableInviteError('User has already been registered')).toBe(true)
  })

  it('matches "already registered"', () => {
    expect(isRecoverableInviteError('Email already registered in the system')).toBe(true)
  })

  it('matches "user already registered"', () => {
    expect(isRecoverableInviteError('User already registered')).toBe(true)
  })

  it('matches "already exists"', () => {
    expect(isRecoverableInviteError('User already exists')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isRecoverableInviteError('USER ALREADY REGISTERED')).toBe(true)
    expect(isRecoverableInviteError('ALREADY EXISTS')).toBe(true)
  })

  it('returns false for unrelated API error', () => {
    expect(isRecoverableInviteError('Invalid email format')).toBe(false)
  })

  it('returns false for generic server error', () => {
    expect(isRecoverableInviteError('Internal server error')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isRecoverableInviteError('')).toBe(false)
  })

  it('returns false for partial match that is unrelated', () => {
    expect(isRecoverableInviteError('New user registration started')).toBe(false)
  })
})

// ─── dispatchInviteEmail ─────────────────────────────────────────────────────

describe('dispatchInviteEmail', () => {
  function makeAdmin(inviteResult: { data?: unknown; error?: null | { message: string } }) {
    return {
      auth: {
        admin: {
          inviteUserByEmail: vi.fn().mockResolvedValue(inviteResult),
        },
      },
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success when invite API call succeeds', async () => {
    const admin = makeAdmin({ data: {}, error: null })
    const result = await dispatchInviteEmail(admin as never, 'new@example.com', '/settings/team')
    expect(result.success).toBe(true)
    expect(result.recoverableExistingUser).toBe(false)
    expect(result.error).toBeUndefined()
  })

  it('calls inviteUserByEmail with the correct email address', async () => {
    const admin = makeAdmin({ data: {}, error: null })
    await dispatchInviteEmail(admin as never, 'user@company.com', '/settings/team')
    expect(admin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      'user@company.com',
      expect.any(Object)
    )
  })

  it('includes /auth/callback in the redirect URL', async () => {
    const admin = makeAdmin({ data: {}, error: null })
    await dispatchInviteEmail(admin as never, 'user@company.com', '/settings/team')
    const [, options] = (admin.auth.admin.inviteUserByEmail as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(options.redirectTo).toContain('/auth/callback')
  })

  it('encodes the redirect path in the URL', async () => {
    const admin = makeAdmin({ data: {}, error: null })
    await dispatchInviteEmail(admin as never, 'user@company.com', '/settings/team')
    const [, options] = (admin.auth.admin.inviteUserByEmail as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(decodeURIComponent(options.redirectTo)).toContain('/settings/team')
  })

  it('builds redirect URL from the configured app URL (no trailing slash)', async () => {
    const admin = makeAdmin({ data: {}, error: null })
    await dispatchInviteEmail(admin as never, 'user@company.com', '/settings/team')
    const [, options] = (admin.auth.admin.inviteUserByEmail as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(options.redirectTo).toMatch(/^https:\/\/app\.complyeur\.com\/auth\/callback/)
  })

  it('returns recoverableExistingUser=true for "already been registered" error', async () => {
    const admin = makeAdmin({ error: { message: 'User has already been registered' } })
    const result = await dispatchInviteEmail(admin as never, 'existing@example.com', '/settings/team')
    expect(result.success).toBe(true)
    expect(result.recoverableExistingUser).toBe(true)
  })

  it('returns recoverableExistingUser=true for "already exists" error', async () => {
    const admin = makeAdmin({ error: { message: 'User already exists' } })
    const result = await dispatchInviteEmail(admin as never, 'existing@example.com', '/settings/team')
    expect(result.success).toBe(true)
    expect(result.recoverableExistingUser).toBe(true)
  })

  it('returns failure for non-recoverable API error', async () => {
    const admin = makeAdmin({ error: { message: 'Invalid email domain' } })
    const result = await dispatchInviteEmail(admin as never, 'user@baddomain', '/settings/team')
    expect(result.success).toBe(false)
    expect(result.recoverableExistingUser).toBe(false)
    expect(result.error).toBe('Invalid email domain')
  })

  it('returns failure for SMTP error', async () => {
    const admin = makeAdmin({ error: { message: 'SMTP connection refused' } })
    const result = await dispatchInviteEmail(admin as never, 'user@company.com', '/settings/team')
    expect(result.success).toBe(false)
    expect(result.error).toBe('SMTP connection refused')
  })
})
