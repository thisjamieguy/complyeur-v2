/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DayCell } from '../day-cell'
import type { ProcessedTripDay } from '../types'

function makeTripDay(overrides: Partial<ProcessedTripDay> = {}): ProcessedTripDay {
  return {
    trip: {
      id: 'trip-1',
      country: 'FR',
      entryDate: new Date('2026-03-10T00:00:00.000Z'),
      exitDate: new Date('2026-03-21T00:00:00.000Z'),
      duration: 12,
      purpose: 'Client visit',
      isPrivate: false,
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

function renderCell(tripDay: ProcessedTripDay) {
  return render(
    <DayCell
      tripDay={tripDay}
      date={tripDay.referenceDate}
      dayWidth={32}
      isWeekend={false}
      isToday={false}
      isMonthStart={false}
      isInRollingWindow={false}
      isRollingWindowStart={false}
      isRollingWindowEnd={false}
      isRowHovered={false}
      isTripStart
      isTripEnd={false}
    />
  )
}

describe('DayCell', () => {
  it('shows the clicked day status for an amber trip day', () => {
    renderCell(makeTripDay())

    fireEvent.click(screen.getByRole('button', { name: /FR trip on Mar 10/i }))

    expect(screen.getByText('Status date:')).toBeInTheDocument()
    expect(screen.getAllByText('Mar 10, 2026')).toHaveLength(2)
    expect(screen.getByText('Warning')).toBeInTheDocument()
    expect(screen.getByText('11')).toBeInTheDocument()
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
    expect(trigger).toHaveClass('bg-slate-100')
    expect(trigger).not.toHaveClass('bg-red-100')

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
})
