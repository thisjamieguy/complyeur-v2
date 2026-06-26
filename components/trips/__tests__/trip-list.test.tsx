/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TripList } from '../trip-list'
import type { Trip } from '@/types/database-helpers'

vi.mock('../edit-trip-modal', () => ({
  EditTripModal: () => null,
}))

vi.mock('../delete-trip-dialog', () => ({
  DeleteTripDialog: () => null,
}))

vi.mock('../reassign-trip-dialog', () => ({
  ReassignTripDialog: () => null,
}))

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    company_id: 'company-1',
    employee_id: 'employee-1',
    country: 'BE',
    entry_date: '2026-07-01',
    exit_date: '2026-07-05',
    travel_days: 5,
    purpose: null,
    job_id: null,
    job_ref: null,
    is_private: false,
    ghosted: false,
    created_at: '2026-06-26T09:00:00.000Z',
    updated_at: '2026-06-26T09:00:00.000Z',
    ...overrides,
  }
}

describe('TripList', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-06-26T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows upcoming planned trips in the default profile view', () => {
    render(
      <TripList
        trips={[
          makeTrip({
            id: 'belgium-trip',
            country: 'BE',
            entry_date: '2026-07-01',
            exit_date: '2026-07-05',
            travel_days: 5,
          }),
        ]}
        employeeId="employee-1"
        employeeName="Emma Patel"
      />
    )

    expect(screen.getByText('Recent + upcoming')).toBeInTheDocument()
    expect(screen.getAllByText('Belgium')).not.toHaveLength(0)
    expect(screen.getAllByText('5')).not.toHaveLength(0)
    expect(screen.queryByText('No recent or upcoming trips')).not.toBeInTheDocument()
  })

  it('still hides old trips from the default current view', () => {
    render(
      <TripList
        trips={[
          makeTrip({
            id: 'old-trip',
            country: 'BE',
            entry_date: '2025-01-01',
            exit_date: '2025-01-05',
            travel_days: 5,
          }),
        ]}
        employeeId="employee-1"
        employeeName="Emma Patel"
      />
    )

    expect(screen.getByText('No recent or upcoming trips')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view all trips/i })).toBeInTheDocument()
  })
})
