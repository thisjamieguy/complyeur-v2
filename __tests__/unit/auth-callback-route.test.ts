import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/auth/callback/route'

interface QueryResult {
  data?: unknown
  error?: { message: string } | null
}

function makeProfileLookup(result: QueryResult) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  return chain
}

function makeProfileUpdate(result: QueryResult = { error: null }) {
  const eq = vi.fn().mockResolvedValue(result)
  return {
    update: vi.fn(() => ({ eq })),
    eq,
  }
}

function makeSupabaseClient(fromResults: unknown[]) {
  let fromIndex = 0

  return {
    auth: {
      exchangeCodeForSession: vi.fn(),
      verifyOtp: vi.fn(),
      getUser: vi.fn(),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    rpc: vi.fn(),
    from: vi.fn(() => fromResults[fromIndex++]),
  }
}

describe('auth callback route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('verifies invite token hashes and accepts the pending team invite', async () => {
    const user = {
      id: 'invite-user-id',
      email: 'new.user@company.com',
      app_metadata: { provider: 'email' },
      user_metadata: {},
    }
    const supabase = makeSupabaseClient([
      makeProfileLookup({ data: null, error: null }),
      makeProfileLookup({
        data: {
          id: 'invite-user-id',
          company_id: 'company-id',
          onboarding_completed_at: '2026-06-26T10:00:00.000Z',
        },
        error: null,
      }),
      makeProfileUpdate(),
    ])

    supabase.auth.verifyOtp.mockResolvedValue({
      data: { user, session: { access_token: 'access-token' } },
      error: null,
    })
    supabase.auth.getUser.mockResolvedValue({ data: { user }, error: null })
    supabase.rpc.mockResolvedValue({ data: 'company-id', error: null })
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const response = await GET(
      new Request(
        'https://app.complyeur.com/auth/callback?next=%2Fsettings%2Fteam&token_hash=invite-token-hash&type=invite'
      )
    )

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'invite-token-hash',
      type: 'invite',
    })
    expect(supabase.auth.getUser).toHaveBeenCalled()
    expect(supabase.rpc).toHaveBeenCalledWith('accept_pending_invite_for_auth_user', {
      p_user_id: 'invite-user-id',
      p_user_email: 'new.user@company.com',
    })
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      data: {
        company_id: 'company-id',
        onboarding_completed: true,
      },
    })
    expect(response.headers.get('location')).toBe('https://app.complyeur.com/settings/team')
  })

  it('continues from an existing callback session when no code is present', async () => {
    const user = {
      id: 'existing-user-id',
      email: 'existing.user@company.com',
      app_metadata: { provider: 'email' },
      user_metadata: {},
    }
    const supabase = makeSupabaseClient([
      makeProfileLookup({
        data: { id: 'existing-user-id', company_id: 'company-id' },
        error: null,
      }),
      makeProfileUpdate(),
    ])

    supabase.auth.getUser.mockResolvedValue({ data: { user }, error: null })
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const response = await GET(
      new Request('https://app.complyeur.com/auth/callback?next=%2Fdashboard')
    )

    expect(supabase.auth.getUser).toHaveBeenCalled()
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled()
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe('https://app.complyeur.com/dashboard')
  })

  it('rejects token hash callbacks with unsupported auth types', async () => {
    const supabase = makeSupabaseClient([])
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const response = await GET(
      new Request(
        'https://app.complyeur.com/auth/callback?token_hash=invite-token-hash&type=unsupported'
      )
    )

    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled()
    expect(supabase.from).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toContain('https://app.complyeur.com/login?error=')
  })
})
