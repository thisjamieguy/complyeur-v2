/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateCompliance, parseDateOnlyAsUTC } from '@/lib/compliance'
import { CALENDAR_HIDE_NO_SCHENGEN_COOKIE } from '@/lib/calendar/filter-preferences'
import { buildDayMap } from '../calendar-view.utils'

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

const dynamicProps: Array<Record<string, unknown>> = []

vi.mock('next/dynamic', () => ({
  default: () => {
    return function DynamicMock(props: Record<string, unknown>) {
      dynamicProps.push(props)
      return null
    }
  },
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

import { CalendarView } from '../calendar-view'
import type {
  ProcessedEmployee,
  TripDateShiftRequest,
  TripDeleteRequest,
  TripEditRequest,
  TripMoveRequest,
  TripResizeRequest,
} from '../types'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function getLatestDesktopCalendarProps(): Record<string, unknown> {
  const desktopProps = [...dynamicProps]
    .reverse()
    .find((props) => Array.isArray(props.dates))

  if (!desktopProps) {
    throw new Error('Desktop calendar props were not captured')
  }

  return desktopProps
}

function getDesktopProps(): { employees: ProcessedEmployee[]; dates: Date[] } {
  const desktopProps = getLatestDesktopCalendarProps()

  return {
    employees: desktopProps.employees as ProcessedEmployee[],
    dates: desktopProps.dates as Date[],
  }
}

describe('CalendarView', () => {
  beforeEach(() => {
    dynamicProps.length = 0
    addTripActionMock.mockReset()
    checkTripOverlapMock.mockReset()
    deleteTripActionMock.mockReset()
    reassignTripActionMock.mockReset()
    showErrorMock.mockReset()
    showSuccessMock.mockReset()
    updateTripAssignmentActionMock.mockReset()
    updateTripActionMock.mockReset()
    checkTripOverlapMock.mockResolvedValue({ hasOverlap: false })
    addTripActionMock.mockResolvedValue({})
    deleteTripActionMock.mockResolvedValue(undefined)
    reassignTripActionMock.mockResolvedValue(undefined)
    updateTripAssignmentActionMock.mockResolvedValue({})
    updateTripActionMock.mockResolvedValue({})
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    document.cookie = `${CALENDAR_HIDE_NO_SCHENGEN_COOKIE}=; Max-Age=0; Path=/`
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('marks past days as historical while keeping planning risk for today and future dates', () => {
    render(
      <CalendarView
        employees={[
          {
            id: 'employee-1',
            name: 'John Smith',
            trips: [
              {
                id: 'history-1',
                country: 'FR',
                entry_date: '2025-12-01',
                exit_date: '2026-02-16',
                purpose: 'Long assignment',
                is_private: false,
                ghosted: false,
              },
              {
                id: 'current-1',
                country: 'DE',
                entry_date: '2026-03-10',
                exit_date: '2026-03-22',
                purpose: 'Client visit',
                is_private: false,
                ghosted: false,
              },
              {
                id: 'future-1',
                country: 'ES',
                entry_date: '2026-04-05',
                exit_date: '2026-04-12',
                purpose: 'Conference',
                is_private: false,
                ghosted: false,
              },
            ],
          },
        ]}
      />
    )

    const { employees: desktopEmployees, dates } = getDesktopProps()
    const [employee] = desktopEmployees
    expect(employee).not.toHaveProperty('dayMap')

    const dayMap = buildDayMap(
      employee.trips,
      dates[0],
      dates[dates.length - 1],
      employee.complianceByDate,
      { today: new Date('2026-03-10T00:00:00.000Z') }
    )

    const historyDay = dayMap.get('2026-02-10')
    const startDay = dayMap.get('2026-03-10')
    const preBreachDay = dayMap.get('2026-03-20')
    const exhaustedDay = dayMap.get('2026-03-21')
    const breachDay = dayMap.get('2026-03-22')

    expect(historyDay?.trip.id).toBe('history-1')
    expect(historyDay?.displayMode).toBe('historical')

    expect(startDay?.trip.id).toBe('current-1')
    expect(preBreachDay?.trip.id).toBe('current-1')
    expect(exhaustedDay?.trip.id).toBe('current-1')
    expect(breachDay?.trip.id).toBe('current-1')

    expect(startDay?.displayMode).toBe('planning')
    expect(preBreachDay?.displayMode).toBe('planning')
    expect(exhaustedDay?.displayMode).toBe('planning')
    expect(breachDay?.displayMode).toBe('planning')
    expect(startDay?.riskLevel).toBe('amber')
    expect(startDay?.isBreachDay).toBe(false)
    expect(preBreachDay?.riskLevel).toBe('amber')
    expect(preBreachDay?.isBreachDay).toBe(false)
    expect(exhaustedDay?.riskLevel).toBe('red')
    expect(exhaustedDay?.isBreachDay).toBe(false)
    expect(breachDay?.riskLevel).toBe('red')
    expect(breachDay?.isBreachDay).toBe(true)

    const expectedCurrent = calculateCompliance(
      [
        {
          country: 'FR',
          entryDate: parseDateOnlyAsUTC('2025-12-01'),
          exitDate: parseDateOnlyAsUTC('2026-02-16'),
        },
        {
          country: 'DE',
          entryDate: parseDateOnlyAsUTC('2026-03-10'),
          exitDate: parseDateOnlyAsUTC('2026-03-22'),
        },
        {
          country: 'ES',
          entryDate: parseDateOnlyAsUTC('2026-04-05'),
          exitDate: parseDateOnlyAsUTC('2026-04-12'),
        },
      ],
      {
        mode: 'audit',
        referenceDate: new Date('2026-03-10T00:00:00.000Z'),
      }
    )

    expect(employee.currentDaysRemaining).toBe(expectedCurrent.daysRemaining)
    expect(employee.currentRiskLevel).toBe(expectedCurrent.riskLevel)
  })

  it('persists the Schengen-only filter and excludes non-Schengen or out-of-range employees', async () => {
    render(
      <CalendarView
        employees={[
          {
            id: 'employee-1',
            name: 'Alice Schengen',
            trips: [
              {
                id: 'trip-1',
                country: 'FR',
                entry_date: '2026-03-12',
                exit_date: '2026-03-16',
                purpose: 'Client visit',
                is_private: false,
                ghosted: false,
              },
            ],
          },
          {
            id: 'employee-2',
            name: 'Bob Non-Schengen',
            trips: [
              {
                id: 'trip-2',
                country: 'US',
                entry_date: '2026-03-13',
                exit_date: '2026-03-14',
                purpose: 'Conference',
                is_private: false,
                ghosted: false,
              },
            ],
          },
          {
            id: 'employee-3',
            name: 'Cara Later Schengen',
            trips: [
              {
                id: 'trip-3',
                country: 'DE',
                entry_date: '2026-05-01',
                exit_date: '2026-05-03',
                purpose: 'Future meeting',
                is_private: false,
                ghosted: false,
              },
            ],
          },
        ]}
      />
    )

    await act(async () => {
      fireEvent.click(
        screen.getByRole('switch', { name: /only show employees with schengen trips/i })
      )
      await Promise.resolve()
    })

    const { employees: desktopEmployees } = getDesktopProps()
    expect(desktopEmployees.map((employee) => employee.name)).toEqual(['Alice Schengen'])
    expect(document.cookie).toContain(`${CALENDAR_HIDE_NO_SCHENGEN_COOKIE}=1`)
  })

  it('passes interactive mode and zoom width to the desktop calendar', async () => {
    render(
      <CalendarView
        interactive
        employees={[
          {
            id: 'employee-1',
            name: 'Alice Schengen',
            trips: [],
          },
        ]}
      />
    )

    expect(screen.getByRole('group', { name: /calendar zoom/i })).toBeInTheDocument()
    expect(getDesktopProps()).toMatchObject({
      employees: [
        expect.objectContaining({
          id: 'employee-1',
          name: 'Alice Schengen',
        }),
      ],
    })

    const initialProps = [...dynamicProps]
      .reverse()
      .find((props) => Array.isArray(props.dates))
    expect(initialProps).toMatchObject({
      interactive: true,
      dayWidth: 32,
      onDeleteTrip: expect.any(Function),
      onEditTrip: expect.any(Function),
      onResizeTrip: expect.any(Function),
      onShiftTripDates: expect.any(Function),
      onMoveTrip: expect.any(Function),
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /3 months/i }))
      await Promise.resolve()
    })

    const zoomedProps = [...dynamicProps]
      .reverse()
      .find((props) => Array.isArray(props.dates))
    expect(zoomedProps).toMatchObject({
      interactive: true,
      dayWidth: 16,
      onDeleteTrip: expect.any(Function),
      onEditTrip: expect.any(Function),
      onResizeTrip: expect.any(Function),
      onShiftTripDates: expect.any(Function),
      onMoveTrip: expect.any(Function),
    })
  })

  it('opens the edit dialog from the calendar and updates trip details', async () => {
    render(
      <CalendarView
        interactive
        employees={[
          {
            id: 'employee-1',
            name: 'Alice Schengen',
            trips: [
              {
                id: 'trip-1',
                country: 'FR',
                entry_date: '2026-03-12',
                exit_date: '2026-03-16',
                purpose: 'Client visit',
                job_ref: 'JOB-1',
                is_private: false,
                ghosted: false,
              },
            ],
          },
        ]}
      />
    )

    const desktopProps = getLatestDesktopCalendarProps()
    const onEditTrip = desktopProps.onEditTrip as (params: TripEditRequest) => void
    const [employee] = (desktopProps.employees as ProcessedEmployee[])
    const [trip] = employee.trips

    await act(async () => {
      onEditTrip({
        employeeId: employee.id,
        employeeName: employee.name,
        trip,
      })
      await Promise.resolve()
    })

    expect(screen.getByRole('dialog', { name: /edit trip/i })).toBeInTheDocument()
    expect(screen.getByText(/update trip details for alice schengen/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/exit date/i), {
      target: { value: '2026-03-18' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /update trip/i }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(updateTripActionMock).toHaveBeenCalledWith('trip-1', 'employee-1', {
      country: 'FR',
      entry_date: '2026-03-12',
      exit_date: '2026-03-18',
      purpose: 'Client visit',
      job_ref: 'JOB-1',
      is_private: false,
      ghosted: false,
    })
    expect(checkTripOverlapMock).toHaveBeenCalledWith(
      'employee-1',
      '2026-03-12',
      '2026-03-18',
      'trip-1'
    )
    expect(showSuccessMock).toHaveBeenCalledWith('Trip updated successfully')
  })

  it('opens a confirmation dialog when a trip is dropped onto another employee', async () => {
    render(
      <CalendarView
        interactive
        employees={[
          {
            id: 'employee-1',
            name: 'Alice Schengen',
            trips: [
              {
                id: 'trip-1',
                country: 'FR',
                entry_date: '2026-03-12',
                exit_date: '2026-03-16',
                purpose: 'Client visit',
                is_private: false,
                ghosted: false,
              },
            ],
          },
          {
            id: 'employee-2',
            name: 'Emma Patel',
            trips: [],
          },
        ]}
      />
    )

    const desktopProps = getLatestDesktopCalendarProps()
    const onMoveTrip = desktopProps.onMoveTrip as (params: {
      tripId: string
      sourceEmployeeId: string
      sourceEmployeeName: string
      targetEmployeeId: string
      targetEmployeeName: string
      country: string
      entryDateKey: string
      exitDateKey: string
      originalEntryDateKey: string
      originalExitDateKey: string
    }) => void

    await act(async () => {
      onMoveTrip({
        tripId: 'trip-1',
        sourceEmployeeId: 'employee-1',
        sourceEmployeeName: 'Alice Schengen',
        targetEmployeeId: 'employee-2',
        targetEmployeeName: 'Emma Patel',
        country: 'FR',
        entryDateKey: '2026-03-12',
        exitDateKey: '2026-03-16',
        originalEntryDateKey: '2026-03-12',
        originalExitDateKey: '2026-03-16',
      })
      await Promise.resolve()
    })

    expect(screen.getByRole('dialog', { name: /move trip/i })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Move FR trip (2026-03-12 to 2026-03-16) from Alice Schengen to Emma Patel?'
      )
    ).toBeInTheDocument()
  })

  it('deletes a trip after confirmation from the calendar', async () => {
    render(
      <CalendarView
        interactive
        employees={[
          {
            id: 'employee-1',
            name: 'Alice Schengen',
            trips: [
              {
                id: 'trip-1',
                country: 'FR',
                entry_date: '2026-03-12',
                exit_date: '2026-03-16',
                purpose: 'Client visit',
                is_private: false,
                ghosted: false,
              },
            ],
          },
        ]}
      />
    )

    const desktopProps = getLatestDesktopCalendarProps()
    const onDeleteTrip = desktopProps.onDeleteTrip as (params: TripDeleteRequest) => void
    const [employee] = (desktopProps.employees as ProcessedEmployee[])
    const [trip] = employee.trips

    await act(async () => {
      onDeleteTrip({
        employeeId: employee.id,
        employeeName: employee.name,
        trip,
      })
      await Promise.resolve()
    })

    expect(screen.getByRole('alertdialog', { name: /delete trip/i })).toBeInTheDocument()
    expect(
      screen.getByText(/delete france trip \(12 Mar 2026 - 16 Mar 2026\) for Alice Schengen/i)
    ).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /delete trip/i }))
      await Promise.resolve()
    })

    expect(deleteTripActionMock).toHaveBeenCalledWith('trip-1', 'employee-1')
    expect(showSuccessMock).toHaveBeenCalledWith('Trip deleted successfully')
  })

  it('blocks resizing a trip when the new date range overlaps another trip', async () => {
    checkTripOverlapMock.mockResolvedValueOnce({
      hasOverlap: true,
      conflictingTrip: {
        id: 'trip-2',
        country: 'BG',
        entry_date: '2026-03-17',
        exit_date: '2026-03-20',
      },
    })

    render(
      <CalendarView
        interactive
        employees={[
          {
            id: 'employee-1',
            name: 'Alice Schengen',
            trips: [
              {
                id: 'trip-1',
                country: 'FR',
                entry_date: '2026-03-12',
                exit_date: '2026-03-16',
                purpose: 'Client visit',
                is_private: false,
                ghosted: false,
              },
            ],
          },
        ]}
      />
    )

    const desktopProps = getLatestDesktopCalendarProps()
    const onResizeTrip = desktopProps.onResizeTrip as (params: TripResizeRequest) => void

    await act(async () => {
      await onResizeTrip({
        tripId: 'trip-1',
        employeeId: 'employee-1',
        edge: 'end',
        dateKey: '2026-03-18',
        originalEntryDateKey: '2026-03-12',
        originalExitDateKey: '2026-03-16',
      })
    })

    expect(checkTripOverlapMock).toHaveBeenCalledWith(
      'employee-1',
      '2026-03-12',
      '2026-03-18',
      'trip-1'
    )
    expect(updateTripActionMock).not.toHaveBeenCalled()
    expect(showErrorMock).toHaveBeenCalledWith(
      'Trip overlap detected',
      expect.stringContaining('Cannot resize trip.')
    )
  })

  it('shifts a trip date range after horizontal drag validation passes', async () => {
    render(
      <CalendarView
        interactive
        employees={[
          {
            id: 'employee-1',
            name: 'Alice Schengen',
            trips: [
              {
                id: 'trip-1',
                country: 'FR',
                entry_date: '2026-03-12',
                exit_date: '2026-03-16',
                purpose: 'Client visit',
                is_private: false,
                ghosted: false,
              },
            ],
          },
          {
            id: 'employee-2',
            name: 'Emma Patel',
            trips: [],
          },
        ]}
      />
    )

    const desktopProps = getLatestDesktopCalendarProps()
    const onShiftTripDates =
      desktopProps.onShiftTripDates as (params: TripDateShiftRequest) => void
    const initialEmployees = desktopProps.employees as ProcessedEmployee[]
    const initialAlice = initialEmployees[0]
    const initialEmma = initialEmployees[1]

    await act(async () => {
      await onShiftTripDates({
        tripId: 'trip-1',
        employeeId: 'employee-1',
        entryDateKey: '2026-03-14',
        exitDateKey: '2026-03-18',
        originalEntryDateKey: '2026-03-12',
        originalExitDateKey: '2026-03-16',
      })
    })

    expect(checkTripOverlapMock).toHaveBeenCalledWith(
      'employee-1',
      '2026-03-14',
      '2026-03-18',
      'trip-1'
    )
    expect(updateTripActionMock).toHaveBeenCalledWith('trip-1', 'employee-1', {
      entry_date: '2026-03-14',
      exit_date: '2026-03-18',
    })
    expect(showSuccessMock).toHaveBeenCalledWith('Trip dates updated')

    const [employee, unaffectedEmployee] = getDesktopProps().employees
    expect(employee).not.toBe(initialAlice)
    expect(unaffectedEmployee).toBe(initialEmma)
    expect(employee.trips[0]).toMatchObject({
      id: 'trip-1',
      entryDate: new Date('2026-03-14T00:00:00.000Z'),
      exitDate: new Date('2026-03-18T00:00:00.000Z'),
    })
  })

  it('blocks shifting a trip when the new date range overlaps another trip', async () => {
    checkTripOverlapMock.mockResolvedValueOnce({
      hasOverlap: true,
      conflictingTrip: {
        id: 'trip-2',
        country: 'BG',
        entry_date: '2026-03-17',
        exit_date: '2026-03-20',
      },
    })

    render(
      <CalendarView
        interactive
        employees={[
          {
            id: 'employee-1',
            name: 'Alice Schengen',
            trips: [
              {
                id: 'trip-1',
                country: 'FR',
                entry_date: '2026-03-12',
                exit_date: '2026-03-16',
                purpose: 'Client visit',
                is_private: false,
                ghosted: false,
              },
            ],
          },
        ]}
      />
    )

    const desktopProps = getLatestDesktopCalendarProps()
    const onShiftTripDates =
      desktopProps.onShiftTripDates as (params: TripDateShiftRequest) => void

    await act(async () => {
      await onShiftTripDates({
        tripId: 'trip-1',
        employeeId: 'employee-1',
        entryDateKey: '2026-03-14',
        exitDateKey: '2026-03-18',
        originalEntryDateKey: '2026-03-12',
        originalExitDateKey: '2026-03-16',
      })
    })

    expect(checkTripOverlapMock).toHaveBeenCalledWith(
      'employee-1',
      '2026-03-14',
      '2026-03-18',
      'trip-1'
    )
    expect(updateTripActionMock).not.toHaveBeenCalled()
    expect(showErrorMock).toHaveBeenCalledWith(
      'Trip overlap detected',
      expect.stringContaining('Cannot shift trip.')
    )
  })

  it('blocks editing a trip when the updated date range overlaps another trip', async () => {
    checkTripOverlapMock.mockResolvedValueOnce({
      hasOverlap: true,
      conflictingTrip: {
        id: 'trip-2',
        country: 'BG',
        entry_date: '2026-03-17',
        exit_date: '2026-03-20',
      },
      message: 'Trip overlaps with an existing trip',
    })

    render(
      <CalendarView
        interactive
        employees={[
          {
            id: 'employee-1',
            name: 'Alice Schengen',
            trips: [
              {
                id: 'trip-1',
                country: 'FR',
                entry_date: '2026-03-12',
                exit_date: '2026-03-16',
                purpose: 'Client visit',
                is_private: false,
                ghosted: false,
              },
            ],
          },
        ]}
      />
    )

    const desktopProps = getLatestDesktopCalendarProps()
    const onEditTrip = desktopProps.onEditTrip as (params: TripEditRequest) => void
    const [employee] = (desktopProps.employees as ProcessedEmployee[])
    const [trip] = employee.trips

    await act(async () => {
      onEditTrip({
        employeeId: employee.id,
        employeeName: employee.name,
        trip,
      })
      await Promise.resolve()
    })

    fireEvent.change(screen.getByLabelText(/exit date/i), {
      target: { value: '2026-03-18' },
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /update trip/i }))
      await Promise.resolve()
    })

    expect(checkTripOverlapMock).toHaveBeenCalledWith(
      'employee-1',
      '2026-03-12',
      '2026-03-18',
      'trip-1'
    )
    expect(updateTripActionMock).not.toHaveBeenCalled()
    expect(screen.getByText('Trip overlaps with an existing trip')).toBeInTheDocument()
  })

  it('blocks moving a trip when the target employee has an overlapping trip', async () => {
    checkTripOverlapMock.mockResolvedValueOnce({
      hasOverlap: true,
      conflictingTrip: {
        id: 'trip-2',
        country: 'BG',
        entry_date: '2026-03-14',
        exit_date: '2026-03-18',
      },
    })

    render(
      <CalendarView
        interactive
        employees={[
          {
            id: 'employee-1',
            name: 'Alice Schengen',
            trips: [
              {
                id: 'trip-1',
                country: 'FR',
                entry_date: '2026-03-12',
                exit_date: '2026-03-16',
                purpose: 'Client visit',
                is_private: false,
                ghosted: false,
              },
            ],
          },
          {
            id: 'employee-2',
            name: 'Emma Patel',
            trips: [],
          },
        ]}
      />
    )

    const desktopProps = getLatestDesktopCalendarProps()
    const onMoveTrip = desktopProps.onMoveTrip as (params: TripMoveRequest) => void

    await act(async () => {
      onMoveTrip({
        tripId: 'trip-1',
        sourceEmployeeId: 'employee-1',
        sourceEmployeeName: 'Alice Schengen',
        targetEmployeeId: 'employee-2',
        targetEmployeeName: 'Emma Patel',
        country: 'FR',
        entryDateKey: '2026-03-12',
        exitDateKey: '2026-03-16',
        originalEntryDateKey: '2026-03-12',
        originalExitDateKey: '2026-03-16',
      })
      await Promise.resolve()
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /move trip/i }))
      await Promise.resolve()
    })

    expect(checkTripOverlapMock).toHaveBeenCalledWith(
      'employee-2',
      '2026-03-12',
      '2026-03-16',
      'trip-1'
    )
    expect(reassignTripActionMock).not.toHaveBeenCalled()
    expect(screen.getByText(/Cannot move trip/i)).toBeInTheDocument()
    expect(showErrorMock).toHaveBeenCalledWith(
      'Trip overlap detected',
      expect.stringContaining("Emma Patel's BG trip")
    )
  })

  it('moves a trip to another employee with adjusted dates after confirmation', async () => {
    render(
      <CalendarView
        interactive
        employees={[
          {
            id: 'employee-1',
            name: 'Alice Schengen',
            trips: [
              {
                id: 'trip-1',
                country: 'FR',
                entry_date: '2026-03-12',
                exit_date: '2026-03-16',
                purpose: 'Client visit',
                is_private: false,
                ghosted: false,
              },
            ],
          },
          {
            id: 'employee-2',
            name: 'Emma Patel',
            trips: [],
          },
        ]}
      />
    )

    const desktopProps = getLatestDesktopCalendarProps()
    const onMoveTrip = desktopProps.onMoveTrip as (params: TripMoveRequest) => void

    await act(async () => {
      onMoveTrip({
        tripId: 'trip-1',
        sourceEmployeeId: 'employee-1',
        sourceEmployeeName: 'Alice Schengen',
        targetEmployeeId: 'employee-2',
        targetEmployeeName: 'Emma Patel',
        country: 'FR',
        entryDateKey: '2026-03-14',
        exitDateKey: '2026-03-18',
        originalEntryDateKey: '2026-03-12',
        originalExitDateKey: '2026-03-16',
      })
      await Promise.resolve()
    })

    expect(
      screen.getByText(
        'Move FR trip (2026-03-14 to 2026-03-18) from Alice Schengen to Emma Patel?'
      )
    ).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /move trip/i }))
      await Promise.resolve()
    })

    expect(checkTripOverlapMock).toHaveBeenCalledWith(
      'employee-2',
      '2026-03-14',
      '2026-03-18',
      'trip-1'
    )
    expect(updateTripAssignmentActionMock).toHaveBeenCalledWith(
      'trip-1',
      'employee-1',
      'employee-2',
      {
        entry_date: '2026-03-14',
        exit_date: '2026-03-18',
      }
    )
    expect(reassignTripActionMock).not.toHaveBeenCalled()
    expect(showSuccessMock).toHaveBeenCalledWith('Trip moved and dates updated')
  })

  it('copies and pastes a trip from the calendar context menu callbacks', async () => {
    render(
      <CalendarView
        interactive
        employees={[
          {
            id: 'employee-1',
            name: 'Alice Schengen',
            trips: [
              {
                id: 'trip-1',
                country: 'FR',
                entry_date: '2026-03-12',
                exit_date: '2026-03-16',
                purpose: 'Client visit',
                job_ref: 'JOB-1',
                is_private: false,
                ghosted: false,
              },
            ],
          },
          {
            id: 'employee-2',
            name: 'Emma Patel',
            trips: [],
          },
        ]}
      />
    )

    const desktopProps = getLatestDesktopCalendarProps()
    const onCopyTrip = desktopProps.onCopyTrip as (params: TripEditRequest) => void
    const [employee] = desktopProps.employees as ProcessedEmployee[]
    const [trip] = employee.trips

    await act(async () => {
      onCopyTrip({
        employeeId: employee.id,
        employeeName: employee.name,
        trip,
      })
      await Promise.resolve()
    })

    expect(showSuccessMock).toHaveBeenCalledWith('Trip copied')
    expect(getLatestDesktopCalendarProps().copiedTrip).toEqual({
      country: 'FR',
      duration: 5,
      purpose: 'Client visit',
      jobRef: 'JOB-1',
      isPrivate: false,
      ghosted: false,
    })

    const afterCopyProps = getLatestDesktopCalendarProps()
    const onPasteTrip = afterCopyProps.onPasteTrip as (params: {
      employeeId: string
      employeeName: string
      dateKey: string
    }) => Promise<void>

    await act(async () => {
      await onPasteTrip({
        employeeId: 'employee-2',
        employeeName: 'Emma Patel',
        dateKey: '2026-03-20',
      })
    })

    expect(checkTripOverlapMock).toHaveBeenCalledWith(
      'employee-2',
      '2026-03-20',
      '2026-03-24'
    )
    expect(addTripActionMock).toHaveBeenCalledWith({
      employee_id: 'employee-2',
      country: 'FR',
      entry_date: '2026-03-20',
      exit_date: '2026-03-24',
      purpose: 'Client visit',
      job_ref: 'JOB-1',
      is_private: false,
      ghosted: false,
    })
    expect(showSuccessMock).toHaveBeenCalledWith('Trip pasted successfully')
  })

  it('blocks pasted trips that overlap the target employee', async () => {
    checkTripOverlapMock.mockResolvedValueOnce({
      hasOverlap: true,
      conflictingTrip: {
        id: 'trip-2',
        country: 'BG',
        entry_date: '2026-03-20',
        exit_date: '2026-03-24',
      },
    })

    render(
      <CalendarView
        interactive
        employees={[
          {
            id: 'employee-1',
            name: 'Alice Schengen',
            trips: [
              {
                id: 'trip-1',
                country: 'FR',
                entry_date: '2026-03-12',
                exit_date: '2026-03-16',
                purpose: 'Client visit',
                is_private: false,
                ghosted: false,
              },
            ],
          },
          {
            id: 'employee-2',
            name: 'Emma Patel',
            trips: [],
          },
        ]}
      />
    )

    const desktopProps = getLatestDesktopCalendarProps()
    const onCopyTrip = desktopProps.onCopyTrip as (params: TripEditRequest) => void
    const [employee] = desktopProps.employees as ProcessedEmployee[]
    const [trip] = employee.trips

    await act(async () => {
      onCopyTrip({
        employeeId: employee.id,
        employeeName: employee.name,
        trip,
      })
      await Promise.resolve()
    })

    const onPasteTrip = getLatestDesktopCalendarProps().onPasteTrip as (params: {
      employeeId: string
      employeeName: string
      dateKey: string
    }) => Promise<void>

    await act(async () => {
      await onPasteTrip({
        employeeId: 'employee-2',
        employeeName: 'Emma Patel',
        dateKey: '2026-03-20',
      })
    })

    expect(addTripActionMock).not.toHaveBeenCalled()
    expect(showErrorMock).toHaveBeenCalledWith(
      'Trip overlap detected',
      expect.stringContaining("Emma Patel's BG trip")
    )
  })

  it('toggles a trip between work and private from the context menu callback', async () => {
    render(
      <CalendarView
        interactive
        employees={[
          {
            id: 'employee-1',
            name: 'Alice Schengen',
            trips: [
              {
                id: 'trip-1',
                country: 'FR',
                entry_date: '2026-03-12',
                exit_date: '2026-03-16',
                purpose: 'Client visit',
                is_private: false,
                ghosted: false,
              },
            ],
          },
        ]}
      />
    )

    const desktopProps = getLatestDesktopCalendarProps()
    const onToggleTripPrivacy = desktopProps.onToggleTripPrivacy as (
      params: TripEditRequest
    ) => Promise<void>
    const [employee] = desktopProps.employees as ProcessedEmployee[]
    const [trip] = employee.trips

    await act(async () => {
      await onToggleTripPrivacy({
        employeeId: employee.id,
        employeeName: employee.name,
        trip,
      })
    })

    expect(updateTripActionMock).toHaveBeenCalledWith('trip-1', 'employee-1', {
      is_private: true,
    })
    expect(showSuccessMock).toHaveBeenCalledWith('Trip marked as private')
  })
})
