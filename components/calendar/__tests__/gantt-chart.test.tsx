/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GanttChart, observeCalendarElementRect } from '../gantt-chart'
import type { ProcessedEmployee, ProcessedTrip } from '../types'
import type { Virtualizer } from '@tanstack/react-virtual'

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

  it('shows employee initials and name in the frozen name column without the day count badge', () => {
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
    expect(screen.queryByText('62/90')).not.toBeInTheDocument()
    expect(screen.getByText('Alice Morgan')).toHaveClass('text-[15px]')
  })

  it('keeps measuring the viewport when ResizeObserver is unavailable', () => {
    const element = document.createElement('div')
    let offsetWidth = 320
    let offsetHeight = 0
    const animationFrames: FrameRequestCallback[] = []
    const fakeWindow = {
      ResizeObserver: undefined,
      requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
        animationFrames.push(callback)
        return animationFrames.length
      }),
      cancelAnimationFrame: vi.fn(),
      setInterval: vi.fn(() => 1),
      clearInterval: vi.fn(),
    } as unknown as Window & typeof globalThis
    const instance = {
      scrollElement: element,
      targetWindow: fakeWindow,
    } as unknown as Virtualizer<HTMLDivElement, Element>
    const onRect = vi.fn()

    Object.defineProperty(element, 'offsetWidth', {
      configurable: true,
      get: () => offsetWidth,
    })
    Object.defineProperty(element, 'offsetHeight', {
      configurable: true,
      get: () => offsetHeight,
    })

    const cleanup = observeCalendarElementRect(instance, onRect)
    expect(onRect).toHaveBeenLastCalledWith({ width: 320, height: 0 })

    offsetWidth = 640
    offsetHeight = 240
    animationFrames[0]?.(0)

    expect(onRect).toHaveBeenLastCalledWith({ width: 640, height: 240 })
    expect(fakeWindow.setInterval).toHaveBeenCalled()

    cleanup?.()
    expect(fakeWindow.cancelAnimationFrame).toHaveBeenCalled()
    expect(fakeWindow.clearInterval).toHaveBeenCalledWith(1)
  })

  it('keeps frozen employee names aligned when the timeline scrolls vertically', () => {
    render(
      <GanttChart
        employees={Array.from({ length: 8 }, (_, index) =>
          makeEmployee({
            id: `employee-${index}`,
            name: `Employee ${index + 1}`,
          })
        )}
        dates={[new Date('2026-03-10T00:00:00.000Z')]}
        dayWidth={32}
      />
    )

    const timeline = screen.getByTestId('calendar-timeline-viewport')
    const gantt = screen.getByTestId('calendar-gantt')
    const horizontalViewport = screen.getByTestId('calendar-horizontal-viewport')
    const namesRows = screen.getByTestId('calendar-names-rows')

    expect(gantt).toHaveClass('min-w-0')
    expect(gantt).toHaveClass('overflow-hidden')
    expect(horizontalViewport).toHaveClass('overflow-x-auto')
    expect(horizontalViewport).toHaveClass('overflow-y-hidden')
    expect(timeline).toHaveClass('overflow-y-auto')

    fireEvent.scroll(timeline, { target: { scrollTop: 120 } })

    expect(namesRows.style.transform).toBe('translate3d(0, -120px, 0)')
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
