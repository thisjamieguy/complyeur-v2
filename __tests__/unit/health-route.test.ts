import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/health/route'

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}))

describe('/api/health route', () => {
  beforeEach(() => {
    createClientMock.mockReset()
  })

  it('returns minimal success payload', async () => {
    createClientMock.mockResolvedValue({
      from: () => ({
        select: () => ({
          limit: () => ({ error: null }),
        }),
      }),
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ status: 'ok' })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('returns minimal failure payload', async () => {
    createClientMock.mockResolvedValue({
      from: () => ({
        select: () => ({
          limit: () => ({ error: new Error('db down') }),
        }),
      }),
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body).toEqual({ status: 'error' })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
