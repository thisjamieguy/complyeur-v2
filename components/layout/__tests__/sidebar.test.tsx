/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarProvider } from '@/contexts/sidebar-context'
import { Sidebar } from '../sidebar'
import type { UserMenuUser } from '../user-menu'

vi.mock('next/image', () => ({
  default: () => null,
}))

vi.mock('@/components/feedback/feedback-dialog', () => ({
  FeedbackDialog: ({ trigger }: { trigger: ReactNode }) => <>{trigger}</>,
}))

vi.mock('@/app/(auth)/actions', () => ({
  logout: vi.fn(),
}))

const user: UserMenuUser = {
  id: 'user-1',
  email: 'manager@complyeur.test',
  full_name: 'E2E Manager',
  role: 'manager',
  canAccessCalendar: true,
  canAccessForecast: true,
  canAccessSavedJobs: false,
  canAccessAdminPanel: false,
}

describe('Sidebar', () => {
  let storage: Map<string, string>

  beforeEach(() => {
    storage = new Map()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          storage.set(key, value)
        }),
        clear: vi.fn(() => storage.clear()),
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('collapses from the desktop toggle and restores the stored state', async () => {
    const { unmount } = render(
      <SidebarProvider>
        <Sidebar user={user} />
      </SidebarProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
    expect(storage.get('complyeur.sidebar.open')).toBe('false')

    unmount()

    render(
      <SidebarProvider>
        <Sidebar user={user} />
      </SidebarProvider>
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
    })
  })
})
