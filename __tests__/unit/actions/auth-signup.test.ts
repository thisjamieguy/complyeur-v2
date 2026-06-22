import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(),
}))

vi.mock('@/lib/security/client-ip', () => ({
  getTrustedClientIpFromHeaders: vi.fn(() => '127.0.0.1'),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}))

function createSignupFormData(overrides?: Partial<{
  name: string
  email: string
  companyName: string
  password: string
  confirmPassword: string
  redirectTo: string
}>): FormData {
  const formData = new FormData()
  formData.append('name', overrides?.name ?? 'Test User')
  formData.append('email', overrides?.email ?? 'test@example.com')
  formData.append('companyName', overrides?.companyName ?? 'Test Company')
  formData.append('password', overrides?.password ?? 'SecurePass123')
  formData.append('confirmPassword', overrides?.confirmPassword ?? 'SecurePass123')
  if (overrides?.redirectTo) {
    formData.append('redirectTo', overrides.redirectTo)
  }
  return formData
}

function createLoginFormData(overrides?: Partial<{
  email: string
  password: string
  redirectTo: string
}>): FormData {
  const formData = new FormData()
  formData.append('email', overrides?.email ?? 'test@example.com')
  formData.append('password', overrides?.password ?? 'SecurePass123')
  if (overrides?.redirectTo) {
    formData.append('redirectTo', overrides.redirectTo)
  }
  return formData
}

describe('login action expected failures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a structured error for invalid credentials instead of throwing', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { rateLimit } = await import('@/lib/rate-limit')

    const supabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials', status: 400 },
        }),
      },
      from: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(rateLimit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    })

    const { login } = await import('@/app/(auth)/actions')

    await expect(
      login(createLoginFormData({ email: 'test@example.com', password: 'wrong-password' }))
    ).resolves.toEqual({
      success: false,
      error: 'Invalid email or password',
    })

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'wrong-password',
    })
  })

  it('returns validation errors without calling Supabase auth', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { rateLimit } = await import('@/lib/rate-limit')

    const supabase = {
      auth: {
        signInWithPassword: vi.fn(),
      },
      from: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(rateLimit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    })

    const { login } = await import('@/app/(auth)/actions')

    const result = await login(createLoginFormData({ email: 'not-an-email' }))

    expect(result).toEqual({
      success: false,
      error: 'Please enter a valid email address',
    })
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled()
  })
})

describe('signup action enumeration parity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects existing-account attempts to the same post-signup route', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { rateLimit } = await import('@/lib/rate-limit')

    const supabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'User already registered', status: 400 },
        }),
        signOut: vi.fn(),
      },
      rpc: vi.fn(),
      from: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(rateLimit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    })

    const { signup } = await import('@/app/(auth)/actions')

    await expect(signup(createSignupFormData())).resolves.toEqual({
      success: true,
      redirectTo: '/check-email',
    })
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
  })

  it('uses the same post-signup route for newly created accounts', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { rateLimit } = await import('@/lib/rate-limit')

    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq: updateEq }))

    const supabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'new@example.com',
              identities: [{ id: 'identity-1' }],
            },
            session: { access_token: 'access-token' },
          },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ data: 'company-123', error: null }),
      from: vi.fn(() => ({ update })),
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(rateLimit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    })

    const { signup } = await import('@/app/(auth)/actions')

    await expect(
      signup(createSignupFormData({ email: 'new@example.com' }))
    ).resolves.toEqual({
      success: true,
      redirectTo: '/check-email',
    })

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'SecurePass123',
      options: {
        data: {
          company_name: 'Test Company',
          full_name: 'Test User',
          given_name: 'Test',
          family_name: 'User',
        },
      },
    })
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('preserves a validated redirect target through the post-signup flow', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { rateLimit } = await import('@/lib/rate-limit')

    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq: updateEq }))

    const supabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-456',
              email: 'buyer@example.com',
              identities: [{ id: 'identity-2' }],
            },
            session: { access_token: 'access-token' },
          },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      rpc: vi.fn().mockResolvedValue({ data: 'company-456', error: null }),
      from: vi.fn(() => ({ update })),
    }

    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(rateLimit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    })

    const { signup } = await import('@/app/(auth)/actions')

    await expect(
      signup(
        createSignupFormData({
          email: 'buyer@example.com',
          redirectTo: '/pricing?autostart=1&plan=starter&billingInterval=monthly',
        })
      )
    ).resolves.toEqual({
      success: true,
      redirectTo:
        '/check-email?next=%2Fpricing%3Fautostart%3D1%26plan%3Dstarter%26billingInterval%3Dmonthly',
    })
  })
})
