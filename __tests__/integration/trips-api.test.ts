/**
 * @fileoverview Trips API integration tests
 *
 * Tests the full trips database API:
 * - CRUD operations (create, read, update, delete)
 * - Bulk operations
 * - Validation (overlap detection, date validation)
 * - Security (tenant isolation, auth requirements)
 * - Edge cases
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  getTripsByEmployeeId,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  getTripCountByEmployeeId,
  createBulkTrips,
  reassignTrip,
} from '@/lib/db/trips'
import { createClient } from '@/lib/supabase/server'
import { AuthError, DatabaseError, NotFoundError, ValidationError } from '@/lib/errors'
import type { Trip } from '@/types/database-helpers'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock requireCompanyAccess
vi.mock('@/lib/security/tenant-access', () => ({
  requireCompanyAccess: vi.fn(),
}))

/**
 * Helper to create a mock Supabase client
 */
function createMockSupabase(options: {
  userId?: string
  companyId?: string
  mockData?: any
  mockError?: any
}) {
  const { userId = 'user-1', companyId = 'company-a', mockData = null, mockError = null } = options

  const chainableMethods = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from: vi.fn(() => chainableMethods),
  }
}

/**
 * Mock trip data factory
 */
function createMockTrip(overrides?: Partial<Trip>): Trip {
  return {
    id: 'trip-1',
    employee_id: 'emp-1',
    company_id: 'company-a',
    country: 'FR',
    entry_date: '2025-11-01',
    exit_date: '2025-11-10',
    purpose: 'Business meeting',
    job_ref: null,
    is_private: false,
    ghosted: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('Trips API - CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createTrip', () => {
    it('creates a trip successfully', async () => {
      const mockTrip = createMockTrip()
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      let fromCallCount = 0

      const employeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'emp-1', company_id: 'company-a' },
          error: null,
        }),
      }

      const existingTripsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTrip,
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn((table: string) => {
          fromCallCount++
          if (table === 'employees') return employeeChain
          if (fromCallCount === 2) return existingTripsChain // Second call to trips is for checking existing
          return insertChain // Third call is for insert
        }),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      const result = await createTrip({
        employee_id: 'emp-1',
        country: 'FR',
        entry_date: '2025-11-01',
        exit_date: '2025-11-10',
        purpose: 'Business meeting',
        job_ref: null,
        is_private: false,
        ghosted: false,
      })

      expect(result).toEqual(mockTrip)
      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: 'emp-1',
          company_id: 'company-a',
        })
      )
    })

    it('throws NotFoundError when employee does not exist', async () => {
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const employeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }

      const supabase = {
        from: vi.fn(() => employeeChain),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await expect(
        createTrip({
          employee_id: 'emp-999',
          country: 'FR',
          entry_date: '2025-11-01',
          exit_date: '2025-11-10',
          purpose: 'Test',
          job_ref: null,
          is_private: false,
          ghosted: false,
        })
      ).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when employee belongs to different company', async () => {
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const employeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'emp-1', company_id: 'company-b' },
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn(() => employeeChain),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await expect(
        createTrip({
          employee_id: 'emp-1',
          country: 'FR',
          entry_date: '2025-11-01',
          exit_date: '2025-11-10',
          purpose: 'Test',
          job_ref: null,
          is_private: false,
          ghosted: false,
        })
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when trip overlaps with existing trip', async () => {
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const employeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'emp-1', company_id: 'company-a' },
          error: null,
        }),
      }

      const existingTripsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'trip-existing',
              entry_date: '2025-11-05',
              exit_date: '2025-11-15',
            },
          ],
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'employees') return employeeChain
          return existingTripsChain
        }),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await expect(
        createTrip({
          employee_id: 'emp-1',
          country: 'FR',
          entry_date: '2025-11-01',
          exit_date: '2025-11-10', // Overlaps with Nov 5-15
          purpose: 'Test',
          job_ref: null,
          is_private: false,
          ghosted: false,
        })
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError for invalid date constraint', async () => {
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      let fromCallCount = 0

      const employeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'emp-1', company_id: 'company-a' },
          error: null,
        }),
      }

      const existingTripsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23514' }, // Check constraint violation
        }),
      }

      const supabase = {
        from: vi.fn((table: string) => {
          fromCallCount++
          if (table === 'employees') return employeeChain
          if (fromCallCount === 2) return existingTripsChain
          return insertChain
        }),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await expect(
        createTrip({
          employee_id: 'emp-1',
          country: 'FR',
          entry_date: '2025-11-10',
          exit_date: '2025-11-01', // Exit before entry
          purpose: 'Test',
          job_ref: null,
          is_private: false,
          ghosted: false,
        })
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('getTripById', () => {
    it('retrieves a trip by ID', async () => {
      const mockTrip = createMockTrip()
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const tripChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTrip,
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn(() => tripChain),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      const result = await getTripById('trip-1')

      expect(result).toEqual(mockTrip)
      expect(tripChain.eq).toHaveBeenCalledWith('id', 'trip-1')
    })

    it('returns null when trip not found', async () => {
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const tripChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }

      const supabase = {
        from: vi.fn(() => tripChain),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      const result = await getTripById('trip-999')

      expect(result).toBeNull()
    })

    it('returns null when trip belongs to different company', async () => {
      const mockTrip = createMockTrip({ company_id: 'company-b' })
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const tripChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockTrip,
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn(() => tripChain),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      const result = await getTripById('trip-1')

      expect(result).toBeNull()
    })
  })

  describe('getTripsByEmployeeId', () => {
    it('retrieves all trips for an employee', async () => {
      const mockTrips = [
        createMockTrip({ id: 'trip-1', entry_date: '2025-11-01' }),
        createMockTrip({ id: 'trip-2', entry_date: '2025-12-01' }),
      ]
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const employeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'emp-1', company_id: 'company-a' },
          error: null,
        }),
      }

      const tripsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTrips,
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'employees') return employeeChain
          return tripsChain
        }),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      const result = await getTripsByEmployeeId('emp-1')

      expect(result).toEqual(mockTrips)
      expect(tripsChain.order).toHaveBeenCalledWith('entry_date', { ascending: false })
    })

    it('returns empty array when employee belongs to different company', async () => {
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const employeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'emp-1', company_id: 'company-b' },
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn(() => employeeChain),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      const result = await getTripsByEmployeeId('emp-1')

      expect(result).toEqual([])
    })
  })

  describe('updateTrip', () => {
    it('updates a trip successfully', async () => {
      const existingTrip = createMockTrip()
      const updatedTrip = createMockTrip({ purpose: 'Updated purpose' })
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      let fromCallCount = 0

      const fetchChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            ...existingTrip,
            employee: { company_id: 'company-a' },
          },
          error: null,
        }),
      }

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedTrip,
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn((table: string) => {
          fromCallCount++
          if (fromCallCount === 1) return fetchChain
          return updateChain
        }),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      const result = await updateTrip('trip-1', { purpose: 'Updated purpose' })

      expect(result).toEqual(updatedTrip)
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: 'Updated purpose',
        })
      )
    })

    it('throws NotFoundError when trip does not exist', async () => {
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const fetchChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }

      const supabase = {
        from: vi.fn(() => fetchChain),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await expect(updateTrip('trip-999', { purpose: 'Test' })).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when trip belongs to different company', async () => {
      const existingTrip = createMockTrip()
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const fetchChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            ...existingTrip,
            employee: { company_id: 'company-b' },
          },
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn(() => fetchChain),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await expect(updateTrip('trip-1', { purpose: 'Test' })).rejects.toThrow(NotFoundError)
    })
  })

  describe('deleteTrip', () => {
    it('deletes a trip successfully', async () => {
      const existingTrip = createMockTrip()
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      let fromCallCount = 0

      const fetchChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: existingTrip,
          error: null,
        }),
      }

      const deleteChain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn((table: string) => {
          fromCallCount++
          if (fromCallCount === 1) return fetchChain
          return deleteChain
        }),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await deleteTrip('trip-1')

      expect(deleteChain.delete).toHaveBeenCalled()
      expect(deleteChain.eq).toHaveBeenCalledWith('id', 'trip-1')
    })

    it('throws NotFoundError when trip does not exist', async () => {
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const fetchChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }

      const supabase = {
        from: vi.fn(() => fetchChain),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await expect(deleteTrip('trip-999')).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when trip belongs to different company', async () => {
      const existingTrip = createMockTrip({ company_id: 'company-b' })
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const fetchChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: existingTrip,
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn(() => fetchChain),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await expect(deleteTrip('trip-1')).rejects.toThrow(NotFoundError)
    })
  })

  describe('getTripCountByEmployeeId', () => {
    it('returns trip count for an employee', async () => {
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const employeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'emp-1', company_id: 'company-a' },
          error: null,
        }),
      }

      const countChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          count: 5,
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === 'employees') return employeeChain
          return countChain
        }),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      const result = await getTripCountByEmployeeId('emp-1')

      expect(result).toBe(5)
    })

    it('returns 0 when employee belongs to different company', async () => {
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const employeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'emp-1', company_id: 'company-b' },
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn(() => employeeChain),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      const result = await getTripCountByEmployeeId('emp-1')

      expect(result).toBe(0)
    })
  })

  describe('createBulkTrips', () => {
    it('creates multiple trips successfully', async () => {
      const mockCreatedTrips = [
        createMockTrip({ id: 'trip-1', entry_date: '2025-11-01', exit_date: '2025-11-05' }),
        createMockTrip({ id: 'trip-2', entry_date: '2025-11-10', exit_date: '2025-11-15' }),
        createMockTrip({ id: 'trip-3', entry_date: '2025-11-20', exit_date: '2025-11-25' }),
      ]
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      let fromCallCount = 0

      const employeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'emp-1', company_id: 'company-a' },
          error: null,
        }),
      }

      const existingTripsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: mockCreatedTrips,
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn((table: string) => {
          fromCallCount++
          if (fromCallCount === 1) return employeeChain
          if (fromCallCount === 2) return existingTripsChain
          return insertChain
        }),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      const result = await createBulkTrips([
        {
          employee_id: 'emp-1',
          country: 'FR',
          entry_date: '2025-11-01',
          exit_date: '2025-11-05',
          purpose: 'Trip 1',
          job_ref: null,
          is_private: false,
          ghosted: false,
        },
        {
          employee_id: 'emp-1',
          country: 'FR',
          entry_date: '2025-11-10',
          exit_date: '2025-11-15',
          purpose: 'Trip 2',
          job_ref: null,
          is_private: false,
          ghosted: false,
        },
        {
          employee_id: 'emp-1',
          country: 'FR',
          entry_date: '2025-11-20',
          exit_date: '2025-11-25',
          purpose: 'Trip 3',
          job_ref: null,
          is_private: false,
          ghosted: false,
        },
      ])

      expect(result.created).toBe(3)
      expect(result.errors).toBeUndefined()
    })

    it('returns errors for invalid trips but creates valid ones', async () => {
      const mockCreatedTrips = [
        createMockTrip({ id: 'trip-1', entry_date: '2025-11-01', exit_date: '2025-11-05' }),
      ]
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      let fromCallCount = 0

      const employeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'emp-1', company_id: 'company-a' },
          error: null,
        }),
      }

      const existingTripsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: mockCreatedTrips,
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn((table: string) => {
          fromCallCount++
          if (fromCallCount === 1) return employeeChain
          if (fromCallCount === 2) return existingTripsChain
          return insertChain
        }),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      const result = await createBulkTrips([
        {
          employee_id: 'emp-1',
          country: 'FR',
          entry_date: '2025-11-01',
          exit_date: '2025-11-05',
          purpose: 'Valid trip',
          job_ref: null,
          is_private: false,
          ghosted: false,
        },
        {
          employee_id: 'emp-1',
          country: 'FR',
          entry_date: '2025-11-15',
          exit_date: '2025-11-10', // Invalid: exit before entry
          purpose: 'Invalid trip',
          job_ref: null,
          is_private: false,
          ghosted: false,
        },
      ])

      expect(result.created).toBe(1)
      expect(result.errors).toBeDefined()
      expect(result.errors).toHaveLength(1)
      expect(result.errors?.[0].index).toBe(1)
      expect(result.errors?.[0].message).toContain('Exit date must be after entry date')
    })

    it('detects overlapping trips within the same batch', async () => {
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      let fromCallCount = 0

      const employeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'emp-1', company_id: 'company-a' },
          error: null,
        }),
      }

      const existingTripsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [createMockTrip()],
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn((table: string) => {
          fromCallCount++
          if (fromCallCount === 1) return employeeChain
          if (fromCallCount === 2) return existingTripsChain
          return insertChain
        }),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      const result = await createBulkTrips([
        {
          employee_id: 'emp-1',
          country: 'FR',
          entry_date: '2025-11-01',
          exit_date: '2025-11-10',
          purpose: 'Trip 1',
          job_ref: null,
          is_private: false,
          ghosted: false,
        },
        {
          employee_id: 'emp-1',
          country: 'FR',
          entry_date: '2025-11-05', // Overlaps with trip 1
          exit_date: '2025-11-15',
          purpose: 'Trip 2',
          job_ref: null,
          is_private: false,
          ghosted: false,
        },
      ])

      expect(result.created).toBe(1)
      expect(result.errors).toBeDefined()
      expect(result.errors).toHaveLength(1)
      expect(result.errors?.[0].index).toBe(1)
      expect(result.errors?.[0].message).toContain('overlaps')
    })

    it('throws NotFoundError when employee does not exist', async () => {
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const employeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }

      const supabase = {
        from: vi.fn(() => employeeChain),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await expect(
        createBulkTrips([
          {
            employee_id: 'emp-999',
            country: 'FR',
            entry_date: '2025-11-01',
            exit_date: '2025-11-05',
            purpose: 'Test',
            job_ref: null,
            is_private: false,
            ghosted: false,
          },
        ])
      ).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when employee belongs to different company', async () => {
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const employeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'emp-1', company_id: 'company-b' },
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn(() => employeeChain),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await expect(
        createBulkTrips([
          {
            employee_id: 'emp-1',
            country: 'FR',
            entry_date: '2025-11-01',
            exit_date: '2025-11-05',
            purpose: 'Test',
            job_ref: null,
            is_private: false,
            ghosted: false,
          },
        ])
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when no trips provided', async () => {
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const supabase = {
        from: vi.fn(),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await expect(createBulkTrips([])).rejects.toThrow(ValidationError)
    })
  })

  describe('reassignTrip', () => {
    it('reassigns trip to new employee successfully', async () => {
      const existingTrip = createMockTrip({ employee_id: 'emp-1' })
      const updatedTrip = createMockTrip({ employee_id: 'emp-2' })
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      let fromCallCount = 0

      const tripChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: existingTrip,
          error: null,
        }),
      }

      const newEmployeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'emp-2', company_id: 'company-a' },
          error: null,
        }),
      }

      const newEmployeeTripsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedTrip,
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn((table: string) => {
          fromCallCount++
          if (fromCallCount === 1) return tripChain // Get existing trip
          if (fromCallCount === 2) return newEmployeeChain // Verify new employee
          if (fromCallCount === 3) return newEmployeeTripsChain // Check for overlaps
          return updateChain // Update trip
        }),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      const result = await reassignTrip('trip-1', 'emp-2')

      expect(result).toEqual(updatedTrip)
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: 'emp-2',
        })
      )
    })

    it('throws NotFoundError when trip does not exist', async () => {
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const tripChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }

      const supabase = {
        from: vi.fn(() => tripChain),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await expect(reassignTrip('trip-999', 'emp-2')).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when trip belongs to different company', async () => {
      const existingTrip = createMockTrip({ company_id: 'company-b' })
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      const tripChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: existingTrip,
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn(() => tripChain),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await expect(reassignTrip('trip-1', 'emp-2')).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when new employee does not exist', async () => {
      const existingTrip = createMockTrip()
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      let fromCallCount = 0

      const tripChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: existingTrip,
          error: null,
        }),
      }

      const newEmployeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }

      const supabase = {
        from: vi.fn((table: string) => {
          fromCallCount++
          if (fromCallCount === 1) return tripChain
          return newEmployeeChain
        }),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await expect(reassignTrip('trip-1', 'emp-999')).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when new employee belongs to different company', async () => {
      const existingTrip = createMockTrip()
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      let fromCallCount = 0

      const tripChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: existingTrip,
          error: null,
        }),
      }

      const newEmployeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'emp-2', company_id: 'company-b' },
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn((table: string) => {
          fromCallCount++
          if (fromCallCount === 1) return tripChain
          return newEmployeeChain
        }),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await expect(reassignTrip('trip-1', 'emp-2')).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when reassignment would cause overlap', async () => {
      const existingTrip = createMockTrip({ entry_date: '2025-11-01', exit_date: '2025-11-10' })
      const { requireCompanyAccess } = await import('@/lib/security/tenant-access')

      vi.mocked(requireCompanyAccess).mockResolvedValue({
        userId: 'user-1',
        companyId: 'company-a',
      })

      let fromCallCount = 0

      const tripChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: existingTrip,
          error: null,
        }),
      }

      const newEmployeeChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'emp-2', company_id: 'company-a' },
          error: null,
        }),
      }

      const newEmployeeTripsChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'trip-existing',
              entry_date: '2025-11-05',
              exit_date: '2025-11-15',
            },
          ],
          error: null,
        }),
      }

      const supabase = {
        from: vi.fn((table: string) => {
          fromCallCount++
          if (fromCallCount === 1) return tripChain
          if (fromCallCount === 2) return newEmployeeChain
          return newEmployeeTripsChain
        }),
      }

      vi.mocked(createClient).mockResolvedValue(supabase as any)

      await expect(reassignTrip('trip-1', 'emp-2')).rejects.toThrow(ValidationError)
    })
  })
})
