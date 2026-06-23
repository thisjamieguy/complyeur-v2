/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { QuickAddTripModal } from '@/components/dashboard/quick-add-trip-modal'

const {
  addTripActionMock,
  checkTripOverlapMock,
  showErrorMock,
  showSuccessMock,
  trackEventMock,
  refreshMock,
} = vi.hoisted(() => ({
  addTripActionMock: vi.fn(),
  checkTripOverlapMock: vi.fn(),
  showErrorMock: vi.fn(),
  showSuccessMock: vi.fn(),
  trackEventMock: vi.fn(),
  refreshMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

vi.mock('@/app/(dashboard)/actions', () => ({
  addTripAction: addTripActionMock,
}))

vi.mock('@/lib/validations/trip-overlap', () => ({
  checkTripOverlap: checkTripOverlapMock,
}))

vi.mock('@/lib/toast', () => ({
  showError: showErrorMock,
  showSuccess: showSuccessMock,
}))

vi.mock('@/lib/analytics/client', () => ({
  trackEvent: trackEventMock,
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('@/components/trips/trip-form', () => ({
  TripForm: ({
    onSubmit,
  }: {
    onSubmit: (data: {
      country: string
      entry_date: string
      exit_date: string
      purpose?: string
      job_ref?: string
      is_private: boolean
      ghosted: boolean
      non_working_days: number
    }) => Promise<void>
  }) => (
    <button
      type="button"
      onClick={() =>
        onSubmit({
          country: 'FR',
          entry_date: '2026-02-01',
          exit_date: '2026-02-05',
          purpose: 'Client workshop',
          job_ref: 'JOB-123',
          is_private: false,
          ghosted: false,
          non_working_days: 2,
        })
      }
    >
      Submit mocked trip
    </button>
  ),
}))

describe('QuickAddTripModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checkTripOverlapMock.mockResolvedValue({ hasOverlap: false })
    addTripActionMock.mockResolvedValue({})
  })

  it('passes rest days through to addTripAction', async () => {
    render(
      <QuickAddTripModal
        employeeId="emp-1"
        employeeName="Alice"
        open
        onOpenChange={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Submit mocked trip' }))

    await waitFor(() => {
      expect(addTripActionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          employee_id: 'emp-1',
          non_working_days: 2,
        })
      )
    })
  })
})
