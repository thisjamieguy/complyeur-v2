import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { checkTripOverlap, checkBulkTripOverlaps } from '@/lib/validations/trip-overlap'

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}

/**
 * Creates a thenable chainable mock for Supabase query builders.
 * All filter methods return `this` so the chain stays fluent.
 * Awaiting the builder resolves to { data, error }.
 */
function makeQueryBuilder(returnData: unknown[] | null, error: unknown = null) {
  const builder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    // Thenable — makes `await builder` work
    then(resolve: (value: unknown) => void) {
      resolve({ data: returnData, error })
    },
  }
  // Make neq also return a thenable so it can be awaited after the chain
  builder.neq = vi.fn().mockReturnValue(builder)
  builder.gte = vi.fn().mockReturnValue(builder)
  return builder
}

function makeProfileBuilder(companyId: string | null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: companyId ? { company_id: companyId } : null,
      error,
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase)
})

describe('checkTripOverlap', () => {
  describe('when not authenticated', () => {
    test('returns no overlap when user is null', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
      const result = await checkTripOverlap('emp-1', '2025-01-01', '2025-01-10')
      expect(result.hasOverlap).toBe(false)
    })

    test('returns no overlap when auth throws', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })
      const result = await checkTripOverlap('emp-1', '2025-01-01', '2025-01-10')
      expect(result.hasOverlap).toBe(false)
    })
  })

  describe('when authenticated but no company', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })
    })

    test('returns no overlap when profile has no company_id', async () => {
      mockSupabase.from.mockReturnValue(makeProfileBuilder(null))
      const result = await checkTripOverlap('emp-1', '2025-01-01', '2025-01-10')
      expect(result.hasOverlap).toBe(false)
    })

    test('returns no overlap when profile fetch errors', async () => {
      mockSupabase.from.mockReturnValue(makeProfileBuilder(null, { message: 'DB error' }))
      const result = await checkTripOverlap('emp-1', '2025-01-01', '2025-01-10')
      expect(result.hasOverlap).toBe(false)
    })
  })

  describe('when authenticated with company', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })
    })

    test('returns no overlap when no conflicting trips', async () => {
      mockSupabase.from
        .mockReturnValueOnce(makeProfileBuilder('company-1'))
        .mockReturnValueOnce(makeQueryBuilder([]))
      const result = await checkTripOverlap('emp-1', '2025-01-01', '2025-01-10')
      expect(result.hasOverlap).toBe(false)
      expect(result.conflictingTrip).toBeUndefined()
    })

    test('returns overlap when conflicting trip exists', async () => {
      const conflictingTrip = {
        id: 'trip-1',
        entry_date: '2025-01-05',
        exit_date: '2025-01-15',
        country: 'FR',
      }
      mockSupabase.from
        .mockReturnValueOnce(makeProfileBuilder('company-1'))
        .mockReturnValueOnce(makeQueryBuilder([conflictingTrip]))
      const result = await checkTripOverlap('emp-1', '2025-01-01', '2025-01-10')
      expect(result.hasOverlap).toBe(true)
      expect(result.conflictingTrip).toEqual(conflictingTrip)
      expect(result.message).toContain('overlaps')
    })

    test('formats conflict dates in message', async () => {
      const conflict = { id: 't1', entry_date: '2025-03-01', exit_date: '2025-03-10', country: 'DE' }
      mockSupabase.from
        .mockReturnValueOnce(makeProfileBuilder('company-1'))
        .mockReturnValueOnce(makeQueryBuilder([conflict]))
      const result = await checkTripOverlap('emp-1', '2025-01-01', '2025-01-10')
      expect(result.message).toContain('2025')
    })

    test('returns no overlap on database error', async () => {
      mockSupabase.from
        .mockReturnValueOnce(makeProfileBuilder('company-1'))
        .mockReturnValueOnce(makeQueryBuilder(null, { message: 'DB error' }))
      const result = await checkTripOverlap('emp-1', '2025-01-01', '2025-01-10')
      expect(result.hasOverlap).toBe(false)
    })

    test('passes excludeTripId to neq when provided', async () => {
      const builder = makeQueryBuilder([])
      mockSupabase.from
        .mockReturnValueOnce(makeProfileBuilder('company-1'))
        .mockReturnValueOnce(builder)

      await checkTripOverlap('emp-1', '2025-01-01', '2025-01-10', 'trip-to-exclude')
      expect(builder.neq).toHaveBeenCalledWith('id', 'trip-to-exclude')
    })
  })
})

describe('checkBulkTripOverlaps', () => {
  describe('when not authenticated', () => {
    test('returns all as no-overlap when auth fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
      const trips = [
        { startDate: '2025-01-01', endDate: '2025-01-05', index: 0 },
        { startDate: '2025-01-10', endDate: '2025-01-15', index: 1 },
      ]
      const results = await checkBulkTripOverlaps('emp-1', trips)
      expect(results).toHaveLength(2)
      expect(results.every((r) => !r.hasOverlap)).toBe(true)
    })
  })

  describe('when authenticated with company', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      })
    })

    test('returns no overlap when no existing trips', async () => {
      const existingTripsBuilder = makeQueryBuilder([])
      mockSupabase.from
        .mockReturnValueOnce(makeProfileBuilder('company-1'))
        .mockReturnValueOnce(existingTripsBuilder)

      const trips = [{ startDate: '2025-01-01', endDate: '2025-01-05', index: 0 }]
      const results = await checkBulkTripOverlaps('emp-1', trips)
      expect(results[0].hasOverlap).toBe(false)
    })

    test('detects overlap with existing trips', async () => {
      const existingTripsBuilder = makeQueryBuilder([
        { id: 'existing-1', entry_date: '2025-01-03', exit_date: '2025-01-08' },
      ])
      mockSupabase.from
        .mockReturnValueOnce(makeProfileBuilder('company-1'))
        .mockReturnValueOnce(existingTripsBuilder)

      const trips = [{ startDate: '2025-01-01', endDate: '2025-01-05', index: 0 }]
      const results = await checkBulkTripOverlaps('emp-1', trips)
      expect(results[0].hasOverlap).toBe(true)
      expect(results[0].message).toContain('overlaps')
    })

    test('detects overlap between trips in the same batch', async () => {
      const existingTripsBuilder = makeQueryBuilder([])
      mockSupabase.from
        .mockReturnValueOnce(makeProfileBuilder('company-1'))
        .mockReturnValueOnce(existingTripsBuilder)

      const trips = [
        { startDate: '2025-01-01', endDate: '2025-01-10', index: 0 },
        { startDate: '2025-01-05', endDate: '2025-01-15', index: 1 }, // overlaps first
      ]
      const results = await checkBulkTripOverlaps('emp-1', trips)
      expect(results[0].hasOverlap).toBe(false)
      expect(results[1].hasOverlap).toBe(true)
    })

    test('returns all as no-overlap on database error', async () => {
      const errorBuilder = makeQueryBuilder(null, { message: 'DB error' })
      mockSupabase.from
        .mockReturnValueOnce(makeProfileBuilder('company-1'))
        .mockReturnValueOnce(errorBuilder)

      const trips = [{ startDate: '2025-01-01', endDate: '2025-01-05', index: 0 }]
      const results = await checkBulkTripOverlaps('emp-1', trips)
      expect(results.every((r) => !r.hasOverlap)).toBe(true)
    })

    test('preserves original index in results', async () => {
      const existingTripsBuilder = makeQueryBuilder([])
      mockSupabase.from
        .mockReturnValueOnce(makeProfileBuilder('company-1'))
        .mockReturnValueOnce(existingTripsBuilder)

      const trips = [
        { startDate: '2025-01-01', endDate: '2025-01-05', index: 3 },
        { startDate: '2025-02-01', endDate: '2025-02-05', index: 7 },
      ]
      const results = await checkBulkTripOverlaps('emp-1', trips)
      expect(results[0].index).toBe(3)
      expect(results[1].index).toBe(7)
    })
  })
})
