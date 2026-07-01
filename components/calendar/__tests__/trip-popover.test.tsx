/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TripPopover } from '../trip-popover'
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

describe('TripPopover', () => {
  it('shows historical recap copy for past trip days', () => {
    render(
      <TripPopover
        tripDay={makeTripDay({
          referenceDate: new Date('2026-03-08T00:00:00.000Z'),
          displayMode: 'historical',
          daysUsed: 85,
          daysRemaining: 5,
          riskLevel: 'red',
        })}
      />
    )

    expect(screen.getByText('Historical trip')).toBeInTheDocument()
    expect(screen.getByText('Trip day:')).toBeInTheDocument()
    expect(screen.queryByText('Status date:')).not.toBeInTheDocument()
  })

  it('shows the clicked day status for an amber trip day', () => {
    render(<TripPopover tripDay={makeTripDay()} />)

    expect(screen.getByText('Status date:')).toBeInTheDocument()
    expect(screen.getAllByText('Mar 10, 2026')).toHaveLength(2)
    expect(screen.getByText('Warning')).toBeInTheDocument()
    expect(screen.getByText('11')).toBeInTheDocument()
  })

  it('shows a later red day in the same trip as critical', () => {
    render(
      <TripPopover
        tripDay={makeTripDay({
          referenceDate: new Date('2026-03-12T00:00:00.000Z'),
          daysUsed: 81,
          daysRemaining: 9,
          riskLevel: 'red',
        })}
      />
    )

    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
  })

  it('labels true breach days as breach', () => {
    render(
      <TripPopover
        tripDay={makeTripDay({
          referenceDate: new Date('2026-03-21T00:00:00.000Z'),
          daysUsed: 90,
          daysRemaining: 0,
          riskLevel: 'red',
          isBreachDay: true,
        })}
      />
    )

    expect(screen.getByText('Breach')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('fires edit and delete callbacks with the trip', () => {
    const onEditTrip = vi.fn()
    const onDeleteTrip = vi.fn()
    const tripDay = makeTripDay()

    render(
      <TripPopover
        tripDay={tripDay}
        onEditTrip={onEditTrip}
        onDeleteTrip={onDeleteTrip}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /edit trip/i }))
    fireEvent.click(screen.getByRole('button', { name: /delete trip/i }))

    expect(onEditTrip).toHaveBeenCalledWith(tripDay.trip)
    expect(onDeleteTrip).toHaveBeenCalledWith(tripDay.trip)
  })

  it('hides edit and delete when callbacks are absent (read-only)', () => {
    render(<TripPopover tripDay={makeTripDay()} />)

    expect(screen.queryByRole('button', { name: /edit trip/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete trip/i })).not.toBeInTheDocument()
  })
})
