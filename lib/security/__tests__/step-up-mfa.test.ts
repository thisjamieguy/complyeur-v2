import { describe, expect, it } from 'vitest'
import {
  STEP_UP_MAX_AGE_SECONDS,
  getLatestMfaVerificationTimestamp,
  requireRecentMfaVerification,
} from '@/lib/security/mfa'

type AmrMethod = { method: string; timestamp: number }

interface MockOptions {
  verifiedFactor?: boolean
  amr?: AmrMethod[] | null
  aalError?: boolean
}

/**
 * Minimal stand-in for the Supabase server client covering only the MFA surface
 * that the step-up helpers touch.
 */
function mockSupabase(opts: MockOptions) {
  const factors = opts.verifiedFactor
    ? { all: [{ id: 'factor-1', status: 'verified', factor_type: 'totp' }] }
    : { all: [] }

  return {
    auth: {
      mfa: {
        listFactors: async () => ({ data: factors, error: null }),
        getAuthenticatorAssuranceLevel: async () =>
          opts.aalError
            ? { data: null, error: { message: 'boom' } }
            : {
                data: {
                  currentLevel: opts.amr && opts.amr.length ? 'aal2' : 'aal1',
                  nextLevel: 'aal2',
                  currentAuthenticationMethods: opts.amr ?? [],
                },
                error: null,
              },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

const NOW = 1_700_000_000 // fixed reference point in Unix seconds

describe('getLatestMfaVerificationTimestamp', () => {
  it('returns the most recent TOTP timestamp', async () => {
    const supabase = mockSupabase({
      verifiedFactor: true,
      amr: [
        { method: 'password', timestamp: NOW - 999 },
        { method: 'totp', timestamp: NOW - 600 },
        { method: 'totp', timestamp: NOW - 120 },
      ],
    })

    expect(await getLatestMfaVerificationTimestamp(supabase)).toBe(NOW - 120)
  })

  it("matches the 'mfa/totp' AMR label variant", async () => {
    const supabase = mockSupabase({
      verifiedFactor: true,
      amr: [{ method: 'mfa/totp', timestamp: NOW - 30 }],
    })

    expect(await getLatestMfaVerificationTimestamp(supabase)).toBe(NOW - 30)
  })

  it('returns null when there is no TOTP method (AAL1 session)', async () => {
    const supabase = mockSupabase({
      verifiedFactor: true,
      amr: [{ method: 'password', timestamp: NOW }],
    })

    expect(await getLatestMfaVerificationTimestamp(supabase)).toBeNull()
  })

  it('returns null when the assurance level call errors', async () => {
    const supabase = mockSupabase({ verifiedFactor: true, aalError: true })
    expect(await getLatestMfaVerificationTimestamp(supabase)).toBeNull()
  })
})

describe('requireRecentMfaVerification', () => {
  it('allows users without a verified factor (nothing to step up)', async () => {
    const supabase = mockSupabase({ verifiedFactor: false })
    expect(await requireRecentMfaVerification(supabase, { nowSeconds: NOW })).toEqual({ ok: true })
  })

  it('allows a fresh verification within the window', async () => {
    const supabase = mockSupabase({
      verifiedFactor: true,
      amr: [{ method: 'totp', timestamp: NOW - 60 }],
    })
    expect(await requireRecentMfaVerification(supabase, { nowSeconds: NOW })).toEqual({ ok: true })
  })

  it('blocks a stale verification past the window', async () => {
    const supabase = mockSupabase({
      verifiedFactor: true,
      amr: [{ method: 'totp', timestamp: NOW - (STEP_UP_MAX_AGE_SECONDS + 1) }],
    })
    expect(await requireRecentMfaVerification(supabase, { nowSeconds: NOW })).toEqual({
      ok: false,
      reason: 'reverify',
    })
  })

  it('fails closed when MFA is enrolled but no TOTP timestamp is present', async () => {
    const supabase = mockSupabase({
      verifiedFactor: true,
      amr: [{ method: 'password', timestamp: NOW }],
    })
    expect(await requireRecentMfaVerification(supabase, { nowSeconds: NOW })).toEqual({
      ok: false,
      reason: 'reverify',
    })
  })

  it('treats a verification exactly at the boundary as still fresh', async () => {
    const supabase = mockSupabase({
      verifiedFactor: true,
      amr: [{ method: 'totp', timestamp: NOW - STEP_UP_MAX_AGE_SECONDS }],
    })
    expect(await requireRecentMfaVerification(supabase, { nowSeconds: NOW })).toEqual({ ok: true })
  })
})
