/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DayCell } from '../day-cell'
import type { ProcessedTripDay } from '../types'

function makeTripDay(overrides: Partial<ProcessedTripDay> = {}): ProcessedTripDay {
  return {
    trip: {
      id: 'trip-1',
      country: 'FR',
      rawCountry: 'FR',
      entryDate: new Date('2026-03-10T00:00:00.000Z'),
      exitDate: new Date('2026-03-21T00:00:00.000Z'),
      duration: 12,
      purpose: 'Client visit',
      jobRef: 'JOB-123',
      isPrivate: false,
      ghosted: false,
      isSchengen: true,
    },
    referenceDate: new Date('2026-03-10T00:00:00.000Z'),
    displayMode: 'planning',
    daysUsed: 79,
    daysRemaining: 11,
    riskLevel: 'amber',
    isBreachDay: false,
    ...overrides,
  }
}

function renderCell(
  tripDay: ProcessedTripDay,
  options: {
    isRowHovered?: boolean
    interactive?: boolean
    isTripStart?: boolean
    isTripEnd?: boolean
    onResizeTrip?: (params: {
      tripId: string
      edge: 'start' | 'end'
      dateKey: string
      originalEntryDateKey: string
      originalExitDateKey: string
    }) => void
    onShiftTripDates?: (params: {
      tripId: string
      entryDateKey: string
      exitDateKey: string
      originalEntryDateKey: string
      originalExitDateKey: string
    }) => void
    onEditTrip?: (trip: ProcessedTripDay['trip']) => void
    onDeleteTrip?: (trip: ProcessedTripDay['trip']) => void
    onMoveTrip?: (params: {
      tripId: string
      targetEmployeeId: string
      targetEmployeeName: string
      country: string
      entryDateKey: string
      exitDateKey: string
      originalEntryDateKey: string
      originalExitDateKey: string
    }) => void
    onMoveTripTargetChange?: (employeeId: string | null) => void
    onOpenContextMenu?: (params: {
      x: number
      y: number
      dateKey: string
      trip?: ProcessedTripDay['trip']
    }) => void
  } = {}
) {
  return render(
    <DayCell
      tripDay={tripDay}
      date={tripDay.referenceDate}
      dateKey="2026-03-10"
      dayWidth={32}
      isRowHovered={options.isRowHovered ?? false}
      isWeekend={false}
      isToday={false}
      isMonthStart={false}
      isInRollingWindow={false}
      isRollingWindowStart={false}
      isRollingWindowEnd={false}
      isTripStart={options.isTripStart ?? true}
      isTripEnd={options.isTripEnd ?? false}
      interactive={options.interactive}
      onEditTrip={options.onEditTrip}
      onDeleteTrip={options.onDeleteTrip}
      onResizeTrip={options.onResizeTrip}
      onShiftTripDates={options.onShiftTripDates}
      onMoveTrip={options.onMoveTrip}
      onMoveTripTargetChange={options.onMoveTripTargetChange}
      onOpenContextMenu={options.onOpenContextMenu}
    />
  )
}

describe('DayCell', () => {
  it('renders empty days as non-interactive grid cells by default', () => {
    const { container } = render(
      <DayCell
        tripDay={undefined}
        date={new Date('2026-03-10T00:00:00.000Z')}
        dateKey="2026-03-10"
        dayWidth={32}
        isRowHovered={false}
        isWeekend={false}
        isToday={false}
        isMonthStart={false}
        isInRollingWindow={false}
        isRollingWindowStart={false}
        isRollingWindowEnd={false}
        isTripStart={false}
        isTripEnd={false}
      />
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass('bg-white')
  })

  it('opens create flow when an interactive empty day is clicked', () => {
    const onCreateTrip = vi.fn()

    render(
      <DayCell
        tripDay={undefined}
        date={new Date('2026-03-10T00:00:00.000Z')}
        dateKey="2026-03-10"
        dayWidth={32}
        isRowHovered={false}
        isWeekend={false}
        isToday={false}
        isMonthStart={false}
        isInRollingWindow={false}
        isRollingWindowStart={false}
        isRollingWindowEnd={false}
        isTripStart={false}
        isTripEnd={false}
        interactive
        onCreateTrip={onCreateTrip}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /add trip on mar 10/i }))

    expect(onCreateTrip).toHaveBeenCalledWith('2026-03-10')
  })

  it('opens the empty-cell context menu from right click in interactive mode', () => {
    const onOpenContextMenu = vi.fn()

    render(
      <DayCell
        tripDay={undefined}
        date={new Date('2026-03-10T00:00:00.000Z')}
        dateKey="2026-03-10"
        dayWidth={32}
        isRowHovered={false}
        isWeekend={false}
        isToday={false}
        isMonthStart={false}
        isInRollingWindow={false}
        isRollingWindowStart={false}
        isRollingWindowEnd={false}
        isTripStart={false}
        isTripEnd={false}
        interactive
        onCreateTrip={vi.fn()}
        onOpenContextMenu={onOpenContextMenu}
      />
    )

    fireEvent.contextMenu(
      screen.getByRole('button', { name: /add trip on mar 10/i }),
      { clientX: 120, clientY: 80 }
    )

    expect(onOpenContextMenu).toHaveBeenCalledWith({
      x: 120,
      y: 80,
      dateKey: '2026-03-10',
    })
  })

  it('calculates a new exit date when the end resize handle is dragged', () => {
    const onResizeTrip = vi.fn()

    renderCell(
      makeTripDay({
        referenceDate: new Date('2026-03-21T00:00:00.000Z'),
      }),
      {
        interactive: true,
        isTripStart: false,
        isTripEnd: true,
        onResizeTrip,
      }
    )

    fireEvent.pointerDown(
      screen.getByRole('button', { name: /resize fr trip end/i }),
      { clientX: 100 }
    )
    fireEvent.pointerMove(window, { clientX: 164 })
    fireEvent.pointerUp(window)

    expect(onResizeTrip).toHaveBeenCalledWith({
      tripId: 'trip-1',
      edge: 'end',
      dateKey: '2026-03-23',
      originalEntryDateKey: '2026-03-10',
      originalExitDateKey: '2026-03-21',
    })
  })

  it('calculates a new entry date when the start resize handle is dragged', () => {
    const onResizeTrip = vi.fn()

    renderCell(makeTripDay(), {
      interactive: true,
      isTripStart: true,
      isTripEnd: false,
      onResizeTrip,
    })

    fireEvent.pointerDown(
      screen.getByRole('button', { name: /resize fr trip start/i }),
      { clientX: 100 }
    )
    fireEvent.pointerMove(window, { clientX: 68 })
    fireEvent.pointerUp(window)

    expect(onResizeTrip).toHaveBeenCalledWith({
      tripId: 'trip-1',
      edge: 'start',
      dateKey: '2026-03-09',
      originalEntryDateKey: '2026-03-10',
      originalExitDateKey: '2026-03-21',
    })
  })

  it('emits a move request when an interactive trip bar is dragged to another employee row', () => {
    const onMoveTrip = vi.fn()
    const onMoveTripTargetChange = vi.fn()
    const originalElementFromPoint = document.elementFromPoint
    const targetRow = document.createElement('div')
    targetRow.setAttribute('data-calendar-employee-row', '')
    targetRow.dataset.employeeId = 'employee-2'
    targetRow.dataset.employeeName = 'Emma Patel'
    document.body.append(targetRow)

    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => targetRow),
    })

    try {
      renderCell(makeTripDay(), {
        interactive: true,
        isTripStart: true,
        isTripEnd: false,
        onMoveTrip,
        onMoveTripTargetChange,
      })

      fireEvent.pointerDown(
        screen.getByRole('button', { name: /FR trip on Mar 10/i }),
        { button: 0, clientX: 100, clientY: 100 }
      )
      fireEvent.pointerMove(window, { clientX: 100, clientY: 116 })
      fireEvent.pointerUp(window, { clientX: 100, clientY: 116 })

      expect(onMoveTripTargetChange).toHaveBeenNthCalledWith(1, 'employee-2')
      expect(onMoveTripTargetChange).toHaveBeenLastCalledWith(null)
      expect(onMoveTrip).toHaveBeenCalledWith({
        tripId: 'trip-1',
        targetEmployeeId: 'employee-2',
        targetEmployeeName: 'Emma Patel',
        country: 'FR',
        entryDateKey: '2026-03-10',
        exitDateKey: '2026-03-21',
        originalEntryDateKey: '2026-03-10',
        originalExitDateKey: '2026-03-21',
      })
    } finally {
      targetRow.remove()
      if (originalElementFromPoint) {
        Object.defineProperty(document, 'elementFromPoint', {
          configurable: true,
          value: originalElementFromPoint,
        })
      } else {
        Reflect.deleteProperty(document, 'elementFromPoint')
      }
    }
  })

  it('emits a date shift request when an interactive trip bar is dragged horizontally', () => {
    const onShiftTripDates = vi.fn()
    const onMoveTrip = vi.fn()
    const onMoveTripTargetChange = vi.fn()

    renderCell(makeTripDay(), {
      interactive: true,
      isTripStart: true,
      isTripEnd: false,
      onShiftTripDates,
      onMoveTrip,
      onMoveTripTargetChange,
    })

    fireEvent.pointerDown(
      screen.getByRole('button', { name: /FR trip on Mar 10/i }),
      { button: 0, clientX: 100, clientY: 100 }
    )
    fireEvent.pointerMove(window, { clientX: 164, clientY: 102 })

    expect(screen.getByTestId('trip-drag-preview')).toHaveTextContent('FR')

    fireEvent.pointerUp(window, { clientX: 164, clientY: 102 })

    expect(onMoveTrip).not.toHaveBeenCalled()
    expect(onMoveTripTargetChange).not.toHaveBeenCalledWith(expect.any(String))
    expect(onShiftTripDates).toHaveBeenCalledWith({
      tripId: 'trip-1',
      entryDateKey: '2026-03-12',
      exitDateKey: '2026-03-23',
      originalEntryDateKey: '2026-03-10',
      originalExitDateKey: '2026-03-21',
    })
  })

  it('emits a move request with shifted dates when dragged diagonally to another employee', () => {
    const onMoveTrip = vi.fn()
    const onShiftTripDates = vi.fn()
    const originalElementFromPoint = document.elementFromPoint
    const targetRow = document.createElement('div')
    targetRow.setAttribute('data-calendar-employee-row', '')
    targetRow.dataset.employeeId = 'employee-2'
    targetRow.dataset.employeeName = 'Emma Patel'
    document.body.append(targetRow)

    Object.defineProperty(targetRow, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 132, left: 0, bottom: 164, right: 500, width: 500, height: 32 }),
    })
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => targetRow),
    })

    try {
      renderCell(makeTripDay(), {
        interactive: true,
        isTripStart: true,
        isTripEnd: false,
        onMoveTrip,
        onShiftTripDates,
      })

      fireEvent.pointerDown(
        screen.getByRole('button', { name: /FR trip on Mar 10/i }),
        { button: 0, clientX: 100, clientY: 100 }
      )
      fireEvent.pointerMove(window, { clientX: 164, clientY: 132 })

      const preview = screen.getByTestId('trip-drag-preview')
      expect(preview).toHaveTextContent('FR')
      expect(preview).toHaveStyle({ top: '132px' })

      fireEvent.pointerUp(window, { clientX: 164, clientY: 132 })

      expect(onShiftTripDates).not.toHaveBeenCalled()
      expect(onMoveTrip).toHaveBeenCalledWith({
        tripId: 'trip-1',
        targetEmployeeId: 'employee-2',
        targetEmployeeName: 'Emma Patel',
        country: 'FR',
        entryDateKey: '2026-03-12',
        exitDateKey: '2026-03-23',
        originalEntryDateKey: '2026-03-10',
        originalExitDateKey: '2026-03-21',
      })
    } finally {
      targetRow.remove()
      if (originalElementFromPoint) {
        Object.defineProperty(document, 'elementFromPoint', {
          configurable: true,
          value: originalElementFromPoint,
        })
      } else {
        Reflect.deleteProperty(document, 'elementFromPoint')
      }
    }
  })

  it('does not draw a per-cell ring when a trip row is a move drop target', () => {
    render(
      <DayCell
        tripDay={makeTripDay()}
        date={new Date('2026-03-10T00:00:00.000Z')}
        dateKey="2026-03-10"
        dayWidth={32}
        isRowHovered={false}
        isWeekend={false}
        isToday={false}
        isMonthStart={false}
        isInRollingWindow={false}
        isRollingWindowStart={false}
        isRollingWindowEnd={false}
        isTripStart
        isTripEnd={false}
        isDropTarget
        interactive
      />
    )

    const tripButton = screen.getByRole('button', { name: /FR trip on Mar 10/i })
    expect(tripButton).not.toHaveClass('ring-1')
    expect(tripButton).not.toHaveClass('ring-sky-300')
    expect(tripButton).toHaveClass('focus-visible:outline-none')
  })

  it('shows the clicked day status for an amber trip day', () => {
    renderCell(makeTripDay())

    fireEvent.click(screen.getByRole('button', { name: /FR trip on Mar 10/i }))

    expect(screen.getByText('Status date:')).toBeInTheDocument()
    expect(screen.getAllByText('Mar 10, 2026')).toHaveLength(2)
    expect(screen.getByText('Warning')).toBeInTheDocument()
    expect(screen.getByText('11')).toBeInTheDocument()
  })

  it('opens the trip context menu from right click in interactive mode', () => {
    const onOpenContextMenu = vi.fn()
    const tripDay = makeTripDay()

    renderCell(tripDay, {
      interactive: true,
      onOpenContextMenu,
    })

    fireEvent.contextMenu(
      screen.getByRole('button', { name: /FR trip on Mar 10/i }),
      { clientX: 164, clientY: 96 }
    )

    expect(onOpenContextMenu).toHaveBeenCalledWith({
      x: 164,
      y: 96,
      dateKey: '2026-03-10',
      trip: tripDay.trip,
    })
  })

  it('opens the edit flow from the trip popover in interactive mode', () => {
    const onEditTrip = vi.fn()
    const tripDay = makeTripDay()

    renderCell(tripDay, {
      interactive: true,
      onEditTrip,
    })

    fireEvent.click(screen.getByRole('button', { name: /FR trip on Mar 10/i }))
    fireEvent.click(screen.getByRole('button', { name: /edit trip/i }))

    expect(onEditTrip).toHaveBeenCalledWith(tripDay.trip)
  })

  it('opens the delete flow from the trip popover in interactive mode', () => {
    const onDeleteTrip = vi.fn()
    const tripDay = makeTripDay()

    renderCell(tripDay, {
      interactive: true,
      onDeleteTrip,
    })

    fireEvent.click(screen.getByRole('button', { name: /FR trip on Mar 10/i }))
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    expect(onDeleteTrip).toHaveBeenCalledWith(tripDay.trip)
  })

  it('renders past trip days as neutral history with recap copy', () => {
    const tripDay = makeTripDay({
      referenceDate: new Date('2026-03-08T00:00:00.000Z'),
      displayMode: 'historical',
      daysUsed: 85,
      daysRemaining: 5,
      riskLevel: 'red',
    })

    renderCell(tripDay)

    const trigger = screen.getByRole('button', { name: /FR trip on Mar 8/i })
    expect(trigger).toHaveClass('bg-slate-200/75')
    expect(trigger).not.toHaveClass('bg-rose-100')

    fireEvent.click(trigger)

    expect(screen.getByText('Historical trip')).toBeInTheDocument()
    expect(screen.getByText('Trip day:')).toBeInTheDocument()
    expect(screen.queryByText('Status date:')).not.toBeInTheDocument()
    expect(screen.queryByText('Current planning status')).not.toBeInTheDocument()
  })

  it('shows a later red day in the same trip as critical', () => {
    renderCell(
      makeTripDay({
        referenceDate: new Date('2026-03-12T00:00:00.000Z'),
        daysUsed: 81,
        daysRemaining: 9,
        riskLevel: 'red',
      })
    )

    fireEvent.click(screen.getByRole('button', { name: /FR trip on Mar 12/i }))

    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
  })

  it('labels true breach days as breach in the popover', () => {
    renderCell(
      makeTripDay({
        referenceDate: new Date('2026-03-21T00:00:00.000Z'),
        daysUsed: 90,
        daysRemaining: 0,
        riskLevel: 'red',
        isBreachDay: true,
      })
    )

    fireEvent.click(screen.getByRole('button', { name: /FR trip on Mar 21/i }))

    expect(screen.getByText('Breach')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('applies row hover styling when the frozen employee column is hovered', () => {
    renderCell(makeTripDay(), { isRowHovered: true })

    expect(
      screen.getByRole('button', { name: /FR trip on Mar 10/i })
    ).toHaveClass('ring-slate-200/80')
  })
})
