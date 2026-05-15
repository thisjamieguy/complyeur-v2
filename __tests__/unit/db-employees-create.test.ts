import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { requireCompanyAccess } from '@/lib/security/tenant-access'
import { ValidationError } from '@/lib/errors'
import { createEmployee } from '@/lib/db/employees'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/security/tenant-access', () => ({
  requireCompanyAccess: vi.fn(),
}))

function buildEmployeesSelectResult(existingEmployees: Array<{ id: string; name: string }>) {
  const is = vi.fn().mockResolvedValue({
    data: existingEmployees,
    error: null,
  })
  const eq = vi.fn().mockReturnValue({ is })
  const select = vi.fn().mockReturnValue({ eq })

  return { select, eq, is }
}

describe('lib/db/employees.createEmployee', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireCompanyAccess).mockResolvedValue({ companyId: 'company-1' } as never)
  })

  it('blocks creating an active employee with the same normalized name', async () => {
    const employeesQuery = buildEmployeesSelectResult([
      { id: 'emp-1', name: 'Brian   Herlihy' },
    ])
    const insert = vi.fn()
    const from = vi.fn((table: string) => {
      if (table === 'employees') {
        return {
          select: employeesQuery.select,
          insert,
        }
      }

      throw new Error(`Unexpected table ${table}`)
    })

    vi.mocked(createClient).mockResolvedValue({ from } as never)

    await expect(
      createEmployee({
        name: '  brian herlihy  ',
        nationality_type: 'uk_citizen',
      })
    ).rejects.toBeInstanceOf(ValidationError)

    expect(insert).not.toHaveBeenCalled()
    expect(employeesQuery.eq).toHaveBeenCalledWith('company_id', 'company-1')
    expect(employeesQuery.is).toHaveBeenCalledWith('deleted_at', null)
  })

  it('allows creation when the same name only exists in soft-deleted records', async () => {
    const employeesQuery = buildEmployeesSelectResult([])
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'emp-2',
        company_id: 'company-1',
        name: 'Brian Herlihy',
        nationality_type: 'uk_citizen',
      },
      error: null,
    })
    const selectAfterInsert = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select: selectAfterInsert })
    const from = vi.fn((table: string) => {
      if (table === 'employees') {
        return {
          select: employeesQuery.select,
          insert,
        }
      }

      throw new Error(`Unexpected table ${table}`)
    })

    vi.mocked(createClient).mockResolvedValue({ from } as never)

    const result = await createEmployee({
      name: 'Brian Herlihy',
      nationality_type: 'uk_citizen',
    })

    expect(insert).toHaveBeenCalledWith({
      company_id: 'company-1',
      name: 'Brian Herlihy',
      nationality_type: 'uk_citizen',
    })
    expect(result.id).toBe('emp-2')
  })
})
