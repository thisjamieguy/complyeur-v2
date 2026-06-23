// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TrialBanner } from '@/components/dashboard/trial-banner'

describe('TrialBanner', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders trial days and upgrade links', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-23T10:00:00.000Z'))

    render(
      <TrialBanner
        tierSlug="starter"
        isTrial
        trialEndsAt="2026-07-07T10:00:00.000Z"
        subscriptionStatus="trialing"
      />
    )

    expect(screen.getByText(/Pro trial: 14 days left/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /choose plan/i })).toHaveAttribute(
      'href',
      '/pricing?autostart=1&plan=starter&billingInterval=monthly'
    )
    expect(screen.getByRole('link', { name: /billing settings/i })).toHaveAttribute('href', '/settings')
  })

  it('does not render for active paid customers', () => {
    const { container } = render(
      <TrialBanner
        tierSlug="starter"
        isTrial={false}
        trialEndsAt={null}
        subscriptionStatus="active"
      />
    )

    expect(container).toBeEmptyDOMElement()
  })
})
