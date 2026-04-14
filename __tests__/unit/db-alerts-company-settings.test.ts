import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/security/tenant-access', () => ({
  requireCompanyAccess: vi.fn(),
  requireCompanyAccessCached: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { requireCompanyAccessCached } from '@/lib/security/tenant-access'
import { getCompanySettings } from '@/lib/db/alerts'

describe('lib/db/alerts getCompanySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireCompanyAccessCached).mockResolvedValue({
      userId: 'user-1',
      companyId: 'company-1',
    } as never)
  })

  it('re-fetches settings when the default row insert loses a creation race', async () => {
    const existingSettings = {
      company_id: 'company-1',
      retention_months: 36,
      warning_threshold: 70,
      critical_threshold: 85,
      email_notifications: true,
      warning_email_enabled: true,
      urgent_email_enabled: true,
      breach_email_enabled: true,
      calendar_load_mode: 'all_employees',
    }

    const initialSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    })
    const initialEq = vi.fn().mockReturnValue({ single: initialSingle })
    const initialSelect = vi.fn().mockReturnValue({ eq: initialEq })

    const insertSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '23505' },
    })
    const insertSelect = vi.fn().mockReturnValue({ single: insertSingle })
    const insert = vi.fn().mockReturnValue({ select: insertSelect })

    const retrySingle = vi.fn().mockResolvedValue({
      data: existingSettings,
      error: null,
    })
    const retryEq = vi.fn().mockReturnValue({ single: retrySingle })
    const retrySelect = vi.fn().mockReturnValue({ eq: retryEq })

    const from = vi
      .fn()
      .mockReturnValueOnce({ select: initialSelect })
      .mockReturnValueOnce({ insert })
      .mockReturnValueOnce({ select: retrySelect })

    vi.mocked(createClient).mockResolvedValue({ from } as never)

    await expect(getCompanySettings()).resolves.toEqual(existingSettings)
    expect(insert).toHaveBeenCalledWith({
      company_id: 'company-1',
      retention_months: 36,
      warning_threshold: 70,
      critical_threshold: 85,
      email_notifications: true,
      warning_email_enabled: true,
      urgent_email_enabled: true,
      breach_email_enabled: true,
      calendar_load_mode: 'all_employees',
    })
  })

  it('throws when creating default settings fails for a non-race reason', async () => {
    const initialSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    })
    const initialEq = vi.fn().mockReturnValue({ single: initialSingle })
    const initialSelect = vi.fn().mockReturnValue({ eq: initialEq })

    const insertSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42501' },
    })
    const insertSelect = vi.fn().mockReturnValue({ single: insertSingle })
    const insert = vi.fn().mockReturnValue({ select: insertSelect })

    const from = vi
      .fn()
      .mockReturnValueOnce({ select: initialSelect })
      .mockReturnValueOnce({ insert })

    vi.mocked(createClient).mockResolvedValue({ from } as never)

    await expect(getCompanySettings()).rejects.toThrow('Failed to create settings')
  })
})
