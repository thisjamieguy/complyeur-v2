// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BillingOnboardingFlow } from '@/components/onboarding/billing-onboarding-flow'
import {
  addFirstEmployee,
  completeOnboarding,
  completeOnboardingForImport,
  inviteTeamMembers,
} from '@/app/(onboarding)/onboarding/actions'
import { trackEvent } from '@/lib/analytics/client'

vi.mock('@/app/(onboarding)/onboarding/actions', () => ({
  addFirstEmployee: vi.fn(),
  completeOnboarding: vi.fn(),
  completeOnboardingForImport: vi.fn(),
  inviteTeamMembers: vi.fn(),
  updateCompanyName: vi.fn(),
}))

vi.mock('@/lib/analytics/client', () => ({
  trackEvent: vi.fn(),
}))

function renderPaidOnboarding() {
  return render(
    <BillingOnboardingFlow
      initialCompanyName="Acme Ltd"
      initialSubscriptionStatus="active"
      initialTierSlug="starter"
      checkoutState={null}
    />
  )
}

describe('BillingOnboardingFlow activation setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        removeItem: vi.fn(),
      },
      configurable: true,
    })
    vi.mocked(addFirstEmployee).mockResolvedValue(undefined)
    vi.mocked(inviteTeamMembers).mockResolvedValue(undefined)
    vi.mocked(completeOnboarding).mockResolvedValue(undefined)
    vi.mocked(completeOnboardingForImport).mockResolvedValue(undefined)
  })

  it('starts paid users at employee setup instead of the welcome state', () => {
    renderPaidOnboarding()

    expect(screen.getByRole('heading', { name: /add your first employee/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /workspace ready/i })).not.toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith('onboarding_employee_setup_started', {
      source: 'onboarding',
      tier: 'starter',
    })
  })

  it('advances to team invites after adding the first employee', async () => {
    renderPaidOnboarding()

    fireEvent.change(screen.getByLabelText(/employee name/i), {
      target: { value: 'Jane Smith' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^add employee$/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /invite your team/i })).toBeInTheDocument()
    })

    const submittedForm = vi.mocked(addFirstEmployee).mock.calls[0][0] as FormData
    expect(submittedForm.get('name')).toBe('Jane Smith')
    expect(submittedForm.get('nationalityType')).toBe('uk_citizen')
  })

  it('renders an import CTA that targets the import workflow', () => {
    renderPaidOnboarding()

    expect(screen.getByRole('link', { name: /import spreadsheet instead/i })).toHaveAttribute(
      'href',
      '/import'
    )
  })

  it('completes onboarding before opening the import workflow', async () => {
    renderPaidOnboarding()

    fireEvent.click(screen.getByRole('link', { name: /import spreadsheet instead/i }))

    await waitFor(() => {
      expect(completeOnboardingForImport).toHaveBeenCalledTimes(1)
    })
    expect(trackEvent).toHaveBeenCalledWith('onboarding_employee_setup_skipped', {
      source: 'onboarding',
      destination: 'import',
      tier: 'starter',
    })
  })

  it('allows employee setup to be skipped and advances to team invites', () => {
    renderPaidOnboarding()

    fireEvent.click(screen.getByRole('button', { name: /do this later/i }))

    expect(screen.getByRole('heading', { name: /invite your team/i })).toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith('onboarding_employee_setup_skipped', {
      source: 'onboarding',
      tier: 'starter',
    })
  })

  it('allows team invites to be skipped and completes from the welcome step', async () => {
    renderPaidOnboarding()

    fireEvent.click(screen.getByRole('button', { name: /do this later/i }))
    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }))
    fireEvent.click(screen.getByRole('button', { name: /enter dashboard/i }))

    await waitFor(() => {
      expect(completeOnboarding).toHaveBeenCalledTimes(1)
    })
    expect(trackEvent).toHaveBeenCalledWith('onboarding_team_invites_skipped', {
      source: 'onboarding',
      tier: 'starter',
    })
    expect(trackEvent).toHaveBeenCalledWith('onboarding_completed', {
      source: 'onboarding',
      tier: 'starter',
    })
  })
})
