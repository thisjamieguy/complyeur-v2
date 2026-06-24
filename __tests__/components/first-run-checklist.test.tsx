// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FirstRunChecklist } from '@/components/dashboard/first-run-checklist'

vi.mock('@/components/employees/unified-add-employee-dialog', () => ({
  UnifiedAddEmployeeDialog: ({ trigger }: { trigger: ReactNode }) => trigger,
}))

describe('FirstRunChecklist', () => {
  beforeEach(() => {
    const storage = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          storage.set(key, value)
        }),
        removeItem: vi.fn((key: string) => {
          storage.delete(key)
        }),
        clear: vi.fn(() => {
          storage.clear()
        }),
      },
      configurable: true,
    })
  })

  it('renders first-run setup actions', () => {
    render(
      <FirstRunChecklist
        hasEmployees={false}
        teamMemberCount={1}
        isPaidCustomer={false}
      />
    )

    expect(screen.getByText('Set up your workspace')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add employee/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open import/i })).toHaveAttribute('href', '/import')
    expect(screen.getByRole('link', { name: /invite team/i })).toHaveAttribute('href', '/settings/team')
    expect(screen.getByRole('link', { name: /choose plan/i })).toHaveAttribute(
      'href',
      '/pricing?autostart=1&plan=starter&billingInterval=monthly'
    )
  })

  it('can be dismissed locally', () => {
    render(
      <FirstRunChecklist
        hasEmployees={false}
        teamMemberCount={1}
        isPaidCustomer={false}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /dismiss setup checklist/i }))

    expect(screen.queryByText('Set up your workspace')).not.toBeInTheDocument()
    expect(window.localStorage.getItem('complyeur.dashboard.first_run_checklist.dismissed')).toBe('1')
  })

  it('hides when setup is already complete', () => {
    render(
      <FirstRunChecklist
        hasEmployees
        teamMemberCount={2}
        isPaidCustomer
      />
    )

    expect(screen.queryByText('Set up your workspace')).not.toBeInTheDocument()
  })
})
