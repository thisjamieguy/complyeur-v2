/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  addTripActionMock,
  checkTripOverlapMock,
  deleteTripActionMock,
  reassignTripActionMock,
  showErrorMock,
  showSuccessMock,
  updateTripAssignmentActionMock,
  updateTripActionMock,
} = vi.hoisted(() => ({
  addTripActionMock: vi.fn(),
  checkTripOverlapMock: vi.fn(),
  deleteTripActionMock: vi.fn(),
  reassignTripActionMock: vi.fn(),
  showErrorMock: vi.fn(),
  showSuccessMock: vi.fn(),
  updateTripAssignmentActionMock: vi.fn(),
  updateTripActionMock: vi.fn(),
}))

vi.mock('@/app/(dashboard)/actions', () => ({
  addTripAction: addTripActionMock,
  deleteTripAction: deleteTripActionMock,
  reassignTripAction: reassignTripActionMock,
  updateTripAssignmentAction: updateTripAssignmentActionMock,
  updateTripAction: updateTripActionMock,
}))

vi.mock('@/lib/validations/trip-overlap', () => ({
  checkTripOverlap: checkTripOverlapMock,
}))

vi.mock('@/lib/toast', () => ({
  showError: showErrorMock,
  showSuccess: showSuccessMock,
}))

import { useCalendarTripActions } from '../use-calendar-trip-actions'
import type { DbTrip, EmployeeWithTrips, ProcessedTrip, TripDeleteRequest } from '../types'

function makeDbTrip(overrides: Partial<DbTrip> = {}): DbTrip {
  return {
    id: 'trip-1',
    country: 'FR',
    entry_date: '2026-02-01',
    exit_date: '2026-02-03',
    purpose: null,
    job_ref: null,
    is_private: false,
    ghosted: false,
    ...overrides,
  }
}

function makeEmployee(overrides: Partial<EmployeeWithTrips> = {}): EmployeeWithTrips {
  return {
    id: 'emp-1',
    name: 'Alex Doe',
    trips: [makeDbTrip()],
    ...overrides,
  }
}

function makeProcessedTrip(overrides: Partial<ProcessedTrip> = {}): ProcessedTrip {
  return {
    id: 'trip-1',
    country: 'FR',
    rawCountry: 'FR',
    entryDate: new Date('2026-02-01T00:00:00.000Z'),
    exitDate: new Date('2026-02-03T00:00:00.000Z'),
    duration: 3,
    purpose: null,
    jobRef: null,
    isPrivate: false,
    ghosted: false,
    isSchengen: true,
    ...overrides,
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useCalendarTripActions', () => {
  beforeEach(() => {
    addTripActionMock.mockReset()
    checkTripOverlapMock.mockReset()
    deleteTripActionMock.mockReset()
    reassignTripActionMock.mockReset()
    showErrorMock.mockReset()
    showSuccessMock.mockReset()
    updateTripAssignmentActionMock.mockReset()
    updateTripActionMock.mockReset()
    checkTripOverlapMock.mockResolvedValue({ hasOverlap: false })
  })

  describe('toggleTripPrivacy', () => {
    it('flips is_private optimistically, then clears the override once the server confirms it', async () => {
      const employee = makeEmployee()
      const deferred = createDeferred<unknown>()
      updateTripActionMock.mockReturnValueOnce(deferred.promise)

      const { result, rerender } = renderHook(
        ({ employees }: { employees: EmployeeWithTrips[] }) => useCalendarTripActions(employees),
        { initialProps: { employees: [employee] } }
      )

      let actionPromise!: Promise<void>
      act(() => {
        actionPromise = result.current.toggleTripPrivacy({
          employeeId: 'emp-1',
          employeeName: 'Alex Doe',
          trip: makeProcessedTrip({ isPrivate: false }),
        })
      })

      // Optimistic: flips instantly, before the mutation resolves.
      expect(result.current.tripOverrides.get('trip-1')?.is_private).toBe(true)

      deferred.resolve({})
      await act(async () => {
        await actionPromise
      })

      expect(updateTripActionMock).toHaveBeenCalledWith('trip-1', 'emp-1', {
        is_private: true,
      })
      expect(showSuccessMock).toHaveBeenCalledWith('Trip marked as private')

      // Server now agrees — re-rendering with the confirmed value clears the override.
      rerender({ employees: [makeEmployee({ trips: [makeDbTrip({ is_private: true })] })] })
      expect(result.current.tripOverrides.has('trip-1')).toBe(false)
    })

    it('rolls back the optimistic flip when the update fails', async () => {
      const employee = makeEmployee()
      const employees = [employee] // stable reference: matches the real CalendarView prop,
      // which doesn't change identity on every internal-state re-render.
      const deferred = createDeferred<unknown>()
      updateTripActionMock.mockReturnValueOnce(deferred.promise)

      const { result } = renderHook(() => useCalendarTripActions(employees))

      let actionPromise!: Promise<void>
      act(() => {
        actionPromise = result.current.toggleTripPrivacy({
          employeeId: 'emp-1',
          employeeName: 'Alex Doe',
          trip: makeProcessedTrip({ isPrivate: false }),
        })
      })

      expect(result.current.tripOverrides.get('trip-1')?.is_private).toBe(true)

      deferred.reject(new Error('network error'))
      await act(async () => {
        await actionPromise
      })

      expect(result.current.tripOverrides.get('trip-1')?.is_private).toBe(false)
      expect(showErrorMock).toHaveBeenCalled()
    })

    it('keeps a trip override until every overridden field is confirmed by the server', async () => {
      const employee = makeEmployee()
      updateTripActionMock.mockResolvedValue({})

      const { result, rerender } = renderHook(
        ({ employees }: { employees: EmployeeWithTrips[] }) => useCalendarTripActions(employees),
        { initialProps: { employees: [employee] } }
      )

      // An in-flight resize that the server hasn't confirmed yet...
      await act(async () => {
        await result.current.resizeTrip({
          tripId: 'trip-1',
          employeeId: 'emp-1',
          edge: 'end',
          dateKey: '2026-02-05',
          originalEntryDateKey: '2026-02-01',
          originalExitDateKey: '2026-02-03',
        })
      })

      // ...followed by a privacy toggle on the same trip.
      await act(async () => {
        await result.current.toggleTripPrivacy({
          employeeId: 'emp-1',
          employeeName: 'Alex Doe',
          trip: makeProcessedTrip({ isPrivate: false }),
        })
      })

      expect(result.current.tripOverrides.get('trip-1')).toEqual({
        entry_date: '2026-02-01',
        exit_date: '2026-02-05',
        is_private: true,
      })

      // Server confirms the privacy change first, but the date change hasn't
      // landed yet — the whole override must stick around so the date edit
      // isn't dropped mid-flight.
      rerender({ employees: [makeEmployee({ trips: [makeDbTrip({ is_private: true })] })] })
      expect(result.current.tripOverrides.get('trip-1')).toEqual({
        entry_date: '2026-02-01',
        exit_date: '2026-02-05',
        is_private: true,
      })

      // Now the date change lands too — only then does the override clear.
      rerender({
        employees: [
          makeEmployee({ trips: [makeDbTrip({ is_private: true, exit_date: '2026-02-05' })] }),
        ],
      })
      expect(result.current.tripOverrides.has('trip-1')).toBe(false)
    })
  })

  describe('confirmDeleteTrip', () => {
    it('hides the trip optimistically on confirm, then clears the override once the server confirms it is gone', async () => {
      const employee = makeEmployee()
      const deferred = createDeferred<void>()
      deleteTripActionMock.mockReturnValueOnce(deferred.promise)

      const { result, rerender } = renderHook(
        ({ employees }: { employees: EmployeeWithTrips[] }) => useCalendarTripActions(employees),
        { initialProps: { employees: [employee] } }
      )

      const deleteRequest: TripDeleteRequest = {
        employeeId: 'emp-1',
        employeeName: 'Alex Doe',
        trip: makeProcessedTrip(),
      }

      act(() => {
        result.current.requestDeleteTrip(deleteRequest)
      })
      expect(result.current.tripDeleteDraft).toEqual(deleteRequest)

      let actionPromise!: Promise<void>
      act(() => {
        actionPromise = result.current.confirmDeleteTrip()
      })

      // Optimistic: hidden instantly, before the delete resolves.
      expect(result.current.tripOverrides.get('trip-1')?.deleted).toBe(true)

      deferred.resolve()
      await act(async () => {
        await actionPromise
      })

      expect(deleteTripActionMock).toHaveBeenCalledWith('trip-1', 'emp-1')
      expect(result.current.tripDeleteDraft).toBeNull()

      // Server confirms the trip is actually gone.
      rerender({ employees: [makeEmployee({ trips: [] })] })
      expect(result.current.tripOverrides.has('trip-1')).toBe(false)
    })

    it('rolls back the optimistic hide when the delete fails, keeping the dialog open', async () => {
      const employee = makeEmployee()
      const employees = [employee]
      const deferred = createDeferred<void>()
      deleteTripActionMock.mockReturnValueOnce(deferred.promise)

      const { result } = renderHook(() => useCalendarTripActions(employees))

      act(() => {
        result.current.requestDeleteTrip({
          employeeId: 'emp-1',
          employeeName: 'Alex Doe',
          trip: makeProcessedTrip(),
        })
      })

      let actionPromise!: Promise<void>
      act(() => {
        actionPromise = result.current.confirmDeleteTrip()
      })

      expect(result.current.tripOverrides.get('trip-1')?.deleted).toBe(true)

      deferred.reject(new Error('network error'))
      await act(async () => {
        await actionPromise
      })

      expect(result.current.tripOverrides.has('trip-1')).toBe(false)
      expect(showErrorMock).toHaveBeenCalled()
      // Dialog stays open so the user can see the error and retry or cancel.
      expect(result.current.tripDeleteDraft).not.toBeNull()
    })
  })

  describe('dialog draft state', () => {
    it('opens and closes the create-trip editor draft', () => {
      const { result } = renderHook(() => useCalendarTripActions([makeEmployee()]))

      act(() => {
        result.current.openCreateTrip({
          employeeId: 'emp-1',
          employeeName: 'Alex Doe',
          dateKey: '2026-02-10',
        })
      })
      expect(result.current.tripEditorDraft).toEqual({
        mode: 'create',
        employeeId: 'emp-1',
        employeeName: 'Alex Doe',
        entryDate: '2026-02-10',
        exitDate: '2026-02-10',
      })

      act(() => {
        result.current.closeTripEditor()
      })
      expect(result.current.tripEditorDraft).toBeNull()
    })
  })
})
