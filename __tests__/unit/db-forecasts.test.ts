import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAllTripsGroupedByEmployee, getEmployeesForSelect } from '@/lib/db/forecasts'
import { createClient } from '@/lib/supabase/server'
import { requireCompanyAccess } from '@/lib/security/tenant-access'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/security/tenant-access', () => ({
  requireCompanyAccess: vi.fn(),
}))

describe('lib/db/forecasts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireCompanyAccess).mockResolvedValue({ companyId: 'company-1' } as never)
  })

  it('filters soft-deleted employees out of the forecast selector query', async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [{ id: 'emp-1', name: 'Alex Youngs' }],
      error: null,
    })
    const order = vi.fn().mockReturnValue({ limit })
    const is = vi.fn().mockReturnValue({ order })
    const eq = vi.fn().mockReturnValue({ is })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })

    vi.mocked(createClient).mockResolvedValue({ from } as never)

    const result = await getEmployeesForSelect()

    expect(from).toHaveBeenCalledWith('employees')
    expect(eq).toHaveBeenCalledWith('company_id', 'company-1')
    expect(is).toHaveBeenCalledWith('deleted_at', null)
    expect(result).toEqual([{ id: 'emp-1', name: 'Alex Youngs' }])
  })

  it('filters soft-deleted employees before grouping forecast trips', async () => {
    const employeeLimit = vi.fn().mockResolvedValue({
      data: [{ id: 'emp-1', name: 'Alex Youngs' }],
      error: null,
    })
    const employeeOrder = vi.fn().mockReturnValue({ limit: employeeLimit })
    const employeeIs = vi.fn().mockReturnValue({ order: employeeOrder })
    const employeeEq = vi.fn().mockReturnValue({ is: employeeIs })
    const employeeSelect = vi.fn().mockReturnValue({ eq: employeeEq })

    const tripLimit = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'trip-1',
          employee_id: 'emp-1',
          company_id: 'company-1',
          country: 'FR',
          entry_date: '2026-03-20',
          exit_date: '2026-03-25',
          purpose: null,
          job_ref: null,
          is_private: false,
          ghosted: false,
          travel_days: 6,
        },
      ],
      error: null,
    })
    const tripOrder = vi.fn().mockReturnValue({ limit: tripLimit })
    const tripEq = vi.fn().mockReturnValue({ order: tripOrder })
    const tripSelect = vi.fn().mockReturnValue({ eq: tripEq })

    const from = vi.fn((table: string) => {
      if (table === 'employees') {
        return { select: employeeSelect }
      }

      if (table === 'trips') {
        return { select: tripSelect }
      }

      throw new Error(`Unexpected table ${table}`)
    })

    vi.mocked(createClient).mockResolvedValue({ from } as never)

    const grouped = await getAllTripsGroupedByEmployee()

    expect(employeeIs).toHaveBeenCalledWith('deleted_at', null)
    expect(grouped.get('emp-1')).toEqual({
      employee: { id: 'emp-1', name: 'Alex Youngs' },
      trips: [
        {
          id: 'trip-1',
          employeeId: 'emp-1',
          companyId: 'company-1',
          country: 'FR',
          entryDate: '2026-03-20',
          exitDate: '2026-03-25',
          purpose: null,
          jobRef: null,
          isPrivate: false,
          ghosted: false,
          travelDays: 6,
        },
      ],
    })
  })
})
