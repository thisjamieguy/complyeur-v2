import { describe, expect, it, vi } from 'vitest'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import { AuthError, DatabaseError, NotFoundError } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

function makeSupabase(options: {
  userId?: string
  companyId?: string | null
  role?: string | null
  isSuperadmin?: boolean
}) {
  const {
    userId = 'user-1',
    companyId = 'company-a',
    role = 'admin',
    isSuperadmin = false,
  } = options

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { company_id: companyId, role, is_superadmin: isSuperadmin },
        error: null,
      }),
    }),
  }
}

describe('requireCompanyAccess', () => {
  it('allows same-tenant access', async () => {
    const supabase = makeSupabase({ companyId: 'company-a' })
    const result = await requireCompanyAccess(supabase as any, 'company-a')

    expect(result.companyId).toBe('company-a')
    expect(result.userId).toBe('user-1')
  })

  it('denies cross-tenant access', async () => {
    const supabase = makeSupabase({ companyId: 'company-a' })

    await expect(
      requireCompanyAccess(supabase as any, 'company-b')
    ).rejects.toThrow(AuthError)
  })

  it('fails closed for superadmin without explicit override', async () => {
    const supabase = makeSupabase({ companyId: null, isSuperadmin: true })

    await expect(
      requireCompanyAccess(supabase as any, 'company-b')
    ).rejects.toThrow(DatabaseError)
  })

  it('allows superadmin when override is explicit', async () => {
    const supabase = makeSupabase({ companyId: null, isSuperadmin: true })

    const result = await requireCompanyAccess(supabase as any, 'company-b', { allowSuperadmin: true })

    expect(result.companyId).toBe('company-b')
    expect(result.isSuperadmin).toBe(true)
  })
})

describe('write paths', () => {
  it('blocks cross-tenant employee update before mutation', async () => {
    const updateSpy = vi.fn()

    // The ownership check queries .eq('company_id', 'company-a') on an employee
    // that belongs to company-b. The DB filter returns no rows — simulated here
    // by returning null data with a PGRST116 error.
    const employeeReadChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      }),
      update: updateSpy,
    }

    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { company_id: 'company-a', role: 'admin', is_superadmin: false },
        error: null,
      }),
    }

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'employees') return employeeReadChain
        if (table === 'profiles') return profileChain
        return employeeReadChain
      }),
    }

    vi.mocked(createClient).mockResolvedValue(supabase as any)

    const { updateEmployee } = await import('@/lib/db/employees')

    await expect(updateEmployee('emp-1', { name: 'New Name' })).rejects.toThrow(NotFoundError)
    expect(updateSpy).not.toHaveBeenCalled()
  })
})
