/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GanttChart } from '../gantt-chart'
import type { ProcessedEmployee, ProcessedTrip } from '../types'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 40,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * 40,
        size: 40,
      })),
  }),
}))

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function makeTrip(overrides: Partial<ProcessedTrip> = {}): ProcessedTrip {
  return {
    id: 'trip-1',
    country: 'FR',
    rawCountry: 'FR',
    entryDate: new Date('2026-03-10T00:00:00.000Z'),
    exitDate: new Date('2026-03-10T00:00:00.000Z'),
    duration: 1,
    purpose: 'Client visit',
    jobRef: 'JOB-123',
    isPrivate: false,
    ghosted: false,
    isSchengen: true,
    ...overrides,
  }
}

function makeEmployee(overrides: Partial<ProcessedEmployee> = {}): ProcessedEmployee {
  return {
    id: 'employee-1',
    name: 'Alice Morgan',
    trips: [],
    complianceByDate: new Map(),
    currentDaysRemaining: 90,
    currentRiskLevel: 'green',
    tripsInRange: 0,
    ...overrides,
  }
}

describe('GanttChart context menu', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows employee compliance status in the frozen name column', () => {
    render(
      <GanttChart
        employees={[
          makeEmployee({
            currentDaysRemaining: 28,
            currentRiskLevel: 'amber',
          }),
        ]}
        dates={[new Date('2026-03-10T00:00:00.000Z')]}
        dayWidth={32}
      />
    )

    expect(screen.getByText('AM')).toBeInTheDocument()
    expect(screen.getByText('Alice Morgan')).toBeInTheDocument()
    expect(screen.getByText('62/90')).toHaveClass('bg-amber-50')
  })

  it('adds a trip from an empty-cell right-click menu', () => {
    const onCreateTrip = vi.fn()
    const onPasteTrip = vi.fn()
    const onOpenEmployeeProfile = vi.fn()

    render(
      <GanttChart
        interactive
        employees={[makeEmployee()]}
        dates={[new Date('2026-03-10T00:00:00.000Z')]}
        dayWidth={32}
        copiedTrip={{
          country: 'IT',
          duration: 3,
          purpose: 'Copied visit',
          jobRef: 'JOB-456',
          isPrivate: false,
          ghosted: false,
        }}
        onCreateTrip={onCreateTrip}
        onPasteTrip={onPasteTrip}
        onOpenEmployeeProfile={onOpenEmployeeProfile}
      />
    )

    const emptyCell = screen.getByRole('button', { name: /add trip on mar 10/i })
    fireEvent.contextMenu(
      emptyCell,
      { clientX: 120, clientY: 80 }
    )

    expect(screen.getByRole('menuitem', { name: /paste trip here/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /go to employee profile/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('menuitem', { name: /add trip/i }))

    expect(onCreateTrip).toHaveBeenCalledWith({
      employeeId: 'employee-1',
      employeeName: 'Alice Morgan',
      dateKey: '2026-03-10',
    })

    fireEvent.contextMenu(
      screen.getByRole('button', { name: /add trip on mar 10/i }),
      { clientX: 120, clientY: 80 }
    )
    fireEvent.click(screen.getByRole('menuitem', { name: /paste trip here/i }))

    expect(onPasteTrip).toHaveBeenCalledWith({
      employeeId: 'employee-1',
      employeeName: 'Alice Morgan',
      dateKey: '2026-03-10',
    })

    fireEvent.contextMenu(emptyCell, { clientX: 120, clientY: 80 })
    fireEvent.click(screen.getByRole('menuitem', { name: /go to employee profile/i }))

    expect(onOpenEmployeeProfile).toHaveBeenCalledWith('employee-1')
  })

  it('runs trip actions from a trip right-click menu', () => {
    const onEditTrip = vi.fn()
    const onDeleteTrip = vi.fn()
    const onCopyTrip = vi.fn()
    const onToggleTripPrivacy = vi.fn()
    const onOpenEmployeeProfile = vi.fn()
    const trip = makeTrip()

    render(
      <GanttChart
        interactive
        employees={[makeEmployee({ trips: [trip], tripsInRange: 1 })]}
        dates={[new Date('2026-03-10T00:00:00.000Z')]}
        dayWidth={32}
        onEditTrip={onEditTrip}
        onDeleteTrip={onDeleteTrip}
        onCopyTrip={onCopyTrip}
        onToggleTripPrivacy={onToggleTripPrivacy}
        onOpenEmployeeProfile={onOpenEmployeeProfile}
      />
    )

    const tripButton = screen.getByRole('button', { name: /FR trip on Mar 10/i })
    fireEvent.contextMenu(tripButton, { clientX: 140, clientY: 96 })
    expect(screen.getByRole('menuitem', { name: /add trip/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /copy trip/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /mark as private/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /go to employee profile/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('menuitem', { name: /edit trip/i }))

    expect(onEditTrip).toHaveBeenCalledWith({
      employeeId: 'employee-1',
      employeeName: 'Alice Morgan',
      trip,
    })

    fireEvent.contextMenu(tripButton, { clientX: 140, clientY: 96 })
    fireEvent.click(screen.getByRole('menuitem', { name: /copy trip/i }))

    expect(onCopyTrip).toHaveBeenCalledWith({
      employeeId: 'employee-1',
      employeeName: 'Alice Morgan',
      trip,
    })

    fireEvent.contextMenu(tripButton, { clientX: 140, clientY: 96 })
    fireEvent.click(screen.getByRole('menuitem', { name: /mark as private/i }))

    expect(onToggleTripPrivacy).toHaveBeenCalledWith({
      employeeId: 'employee-1',
      employeeName: 'Alice Morgan',
      trip,
    })

    fireEvent.contextMenu(tripButton, { clientX: 140, clientY: 96 })
    fireEvent.click(screen.getByRole('menuitem', { name: /go to employee profile/i }))

    expect(onOpenEmployeeProfile).toHaveBeenCalledWith('employee-1')

    fireEvent.contextMenu(tripButton, { clientX: 140, clientY: 96 })
    fireEvent.click(screen.getByRole('menuitem', { name: /delete trip/i }))

    expect(onDeleteTrip).toHaveBeenCalledWith({
      employeeId: 'employee-1',
      employeeName: 'Alice Morgan',
      trip,
    })
  })

  it('labels private trips with a work-trip toggle', () => {
    const onToggleTripPrivacy = vi.fn()
    const trip = makeTrip({
      country: 'XX',
      isPrivate: true,
    })

    render(
      <GanttChart
        interactive
        employees={[makeEmployee({ trips: [trip], tripsInRange: 1 })]}
        dates={[new Date('2026-03-10T00:00:00.000Z')]}
        dayWidth={32}
        onToggleTripPrivacy={onToggleTripPrivacy}
      />
    )

    fireEvent.contextMenu(
      screen.getByRole('button', { name: /Private trip on Mar 10/i }),
      { clientX: 140, clientY: 96 }
    )
    fireEvent.click(screen.getByRole('menuitem', { name: /mark as work trip/i }))

    expect(onToggleTripPrivacy).toHaveBeenCalledWith({
      employeeId: 'employee-1',
      employeeName: 'Alice Morgan',
      trip,
    })
  })
})
