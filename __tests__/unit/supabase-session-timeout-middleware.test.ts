import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockUser } from '@/__tests__/utils/mock-supabase'

const { createServerClientMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: createServerClientMock,
}))

import { updateSession } from '@/lib/supabase/middleware'

type QueryResult<T> = {
  data: T
  error: { message: string } | null
}

function createProfileSelectBuilder<T>(result: QueryResult<T>) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
}

function createUpdateBuilder(result: QueryResult<null>) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(result),
  }
}

function createMiddlewareSupabaseClient(options: {
  user: ReturnType<typeof createMockUser> | null
  profileResult: QueryResult<{
    id: string
    company_id: string | null
    created_at: string | null
    onboarding_completed_at: string | null
    last_activity_at: string | null
  } | null>
  companySettingsResult: QueryResult<{
    session_timeout_minutes: number | null
  } | null>
  profileUpdateResult?: QueryResult<null>
}) {
  let profilesCallCount = 0

  const profileSelectBuilder = createProfileSelectBuilder(options.profileResult)
  const companySettingsSelectBuilder = createProfileSelectBuilder(options.companySettingsResult)
  const profileUpdateBuilder = createUpdateBuilder(
    options.profileUpdateResult ?? { data: null, error: null }
  )

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user },
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: options.user }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        profilesCallCount += 1
        return profilesCallCount === 1 ? profileSelectBuilder : profileUpdateBuilder
      }

      if (table === 'company_settings') {
        return companySettingsSelectBuilder
      }

      throw new Error(`Unexpected table: ${table}`)
    }),
    rpc: vi.fn(),
  }
}

describe('Supabase session timeout middleware', () => {
  beforeEach(() => {
    createServerClientMock.mockReset()
  })

  it('allows an active session and updates last activity', async () => {
    const user = createMockUser({
      created_at: '2026-05-05T10:00:00.000Z',
    })
    const supabaseClient = createMiddlewareSupabaseClient({
      user,
      profileResult: {
        data: {
          id: user.id,
          company_id: 'company-1',
          created_at: '2026-05-01T09:00:00.000Z',
          onboarding_completed_at: '2026-05-01T10:00:00.000Z',
          last_activity_at: new Date(Date.now() - 5 * 60_000).toISOString(),
        },
        error: null,
      },
      companySettingsResult: {
        data: { session_timeout_minutes: 30 },
        error: null,
      },
    })

    createServerClientMock.mockReturnValue(supabaseClient)

    const result = await updateSession(new NextRequest('http://localhost:3000/dashboard'))

    expect(result.sessionExpired).toBe(false)
    expect(result.user?.id).toBe(user.id)
    expect(result.needsOnboarding).toBe(false)
    expect(supabaseClient.auth.signOut).not.toHaveBeenCalled()
    expect(supabaseClient.auth.updateUser).toHaveBeenCalledWith({
      data: {
        company_id: 'company-1',
        onboarding_completed: true,
      },
    })
  })

  it('denies an expired page session and redirects to login', async () => {
    const user = createMockUser({
      created_at: '2026-05-05T10:00:00.000Z',
    })
    const supabaseClient = createMiddlewareSupabaseClient({
      user,
      profileResult: {
        data: {
          id: user.id,
          company_id: 'company-1',
          created_at: '2026-05-01T09:00:00.000Z',
          onboarding_completed_at: '2026-05-01T10:00:00.000Z',
          last_activity_at: new Date(Date.now() - 45 * 60_000).toISOString(),
        },
        error: null,
      },
      companySettingsResult: {
        data: { session_timeout_minutes: 30 },
        error: null,
      },
    })

    createServerClientMock.mockReturnValue(supabaseClient)

    const result = await updateSession(new NextRequest('http://localhost:3000/dashboard'))

    expect(result.sessionExpired).toBe(true)
    expect(result.supabaseResponse.status).toBe(307)
    expect(result.supabaseResponse.headers.get('location')).toBe('http://localhost:3000/login')
    expect(supabaseClient.auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('denies an expired API session with a 401 response', async () => {
    const user = createMockUser({
      created_at: '2026-05-05T10:00:00.000Z',
    })
    const supabaseClient = createMiddlewareSupabaseClient({
      user,
      profileResult: {
        data: {
          id: user.id,
          company_id: 'company-1',
          created_at: '2026-05-01T09:00:00.000Z',
          onboarding_completed_at: '2026-05-01T10:00:00.000Z',
          last_activity_at: new Date(Date.now() - 45 * 60_000).toISOString(),
        },
        error: null,
      },
      companySettingsResult: {
        data: { session_timeout_minutes: 30 },
        error: null,
      },
    })

    createServerClientMock.mockReturnValue(supabaseClient)

    const result = await updateSession(new NextRequest('http://localhost:3000/api/billing/status'))
    const body = await result.supabaseResponse.json()

    expect(result.sessionExpired).toBe(true)
    expect(result.supabaseResponse.status).toBe(401)
    expect(body.error).toBe('Session expired')
    expect(supabaseClient.auth.signOut).toHaveBeenCalledTimes(1)
  })
})
