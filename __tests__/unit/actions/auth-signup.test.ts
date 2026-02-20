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
}>): FormData {
  const formData = new FormData()
  formData.append('name', overrides?.name ?? 'Test User')
  formData.append('email', overrides?.email ?? 'test@example.com')
  formData.append('companyName', overrides?.companyName ?? 'Test Company')
  formData.append('password', overrides?.password ?? 'SecurePass123')
  formData.append('confirmPassword', overrides?.confirmPassword ?? 'SecurePass123')
  return formData
}

describe('signup action enumeration parity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects existing-account attempts to the same post-signup route', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { rateLimit } = await import('@/lib/rate-limit')
    const { redirect } = await import('next/navigation')

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
    vi.mocked(redirect).mockImplementation(((path: string) => {
      throw new Error(`REDIRECT:${path}`)
    }) as never)

    const { signup } = await import('@/app/(auth)/actions')

    await expect(signup(createSignupFormData())).rejects.toThrow(
      'REDIRECT:/login?signup=check-email'
    )
    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(supabase.auth.signOut).not.toHaveBeenCalled()
  })

  it('uses the same post-signup route for newly created accounts', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    const { rateLimit } = await import('@/lib/rate-limit')
    const { redirect } = await import('next/navigation')

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
    vi.mocked(redirect).mockImplementation(((path: string) => {
      throw new Error(`REDIRECT:${path}`)
    }) as never)

    const { signup } = await import('@/app/(auth)/actions')

    await expect(
      signup(createSignupFormData({ email: 'new@example.com' }))
    ).rejects.toThrow('REDIRECT:/login?signup=check-email')

    expect(supabase.rpc).toHaveBeenCalledWith(
      'create_company_and_profile',
      expect.objectContaining({
        user_id: 'user-123',
        user_email: 'new@example.com',
      })
    )
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
})
