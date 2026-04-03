import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/health/route'

const { createAdminClientMock, createClientMock } = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(),
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

describe('/api/health route', () => {
  beforeEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    createAdminClientMock.mockReset()
    createClientMock.mockReset()
  })

  it('returns minimal success payload', async () => {
    createClientMock.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ error: null }),
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ status: 'ok' })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('returns minimal failure payload', async () => {
    createClientMock.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ error: new Error('db down') }),
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ status: 'error' })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('falls back to the admin probe when ping() is unavailable', async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

    createClientMock.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({
        error: {
          code: 'PGRST202',
          message: 'Could not find the function public.ping without parameters in the schema cache',
        },
      }),
    })

    const limitMock = vi.fn().mockResolvedValue({ error: null })
    const selectMock = vi.fn().mockReturnValue({ limit: limitMock })
    const fromMock = vi.fn().mockReturnValue({ select: selectMock })

    createAdminClientMock.mockReturnValue({
      from: fromMock,
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ status: 'ok' })
    expect(fromMock).toHaveBeenCalledWith('profiles')
    expect(selectMock).toHaveBeenCalledWith('id', { head: true })
    expect(limitMock).toHaveBeenCalledWith(1)
  })
})
