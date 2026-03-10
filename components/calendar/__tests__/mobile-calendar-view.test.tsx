/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MobileCalendarView } from '../mobile-calendar-view'

describe('MobileCalendarView', () => {
  it('shows current employee compliance status without historical trip messaging', () => {
    render(
      <MobileCalendarView
        employees={[
          {
            id: 'employee-1',
            name: 'John Smith',
            tripsInRange: 3,
            currentDaysRemaining: 12,
            currentRiskLevel: 'amber',
          },
        ]}
      />
    )

    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('Warning')).toBeInTheDocument()
    expect(screen.getByText(/12 days remaining/i)).toBeInTheDocument()
    expect(screen.getByText(/3 trips in range/i)).toBeInTheDocument()
    expect(screen.queryByText('Historical trip')).not.toBeInTheDocument()
  })
})
