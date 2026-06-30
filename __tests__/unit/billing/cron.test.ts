import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildExpiredTrialDowngradeUpdates,
  resolveRenewalAmountDue,
} from '@/app/api/cron/billing/route'
import { getStripe } from '@/lib/billing/stripe'

vi.mock('@/lib/billing/stripe', () => ({
  getStripe: vi.fn(),
}))

vi.mock('@/lib/security/cron-auth', () => ({
  withCronAuth: (handler: unknown) => handler,
}))

describe('billing cron renewal amount resolution', () => {
  const mockedGetStripe = vi.mocked(getStripe)

  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetStripe.mockReturnValue({
      invoices: {
        createPreview: vi.fn(async () => ({
          amount_due: 149000,
          currency: 'gbp',
        })),
      },
    } as unknown as ReturnType<typeof getStripe>)
  })

  it('uses the Stripe upcoming invoice preview amount for renewal emails', async () => {
    const amountDue = await resolveRenewalAmountDue({
      stripeSubscriptionId: 'sub_annual_123',
      tierSlug: 'starter',
    })

    expect(amountDue).toBe('£1,490')
    expect(mockedGetStripe().invoices.createPreview).toHaveBeenCalledWith({
      subscription: 'sub_annual_123',
    })
  })

  it('falls back to the local plan amount when no subscription id is available', async () => {
    const amountDue = await resolveRenewalAmountDue({
      stripeSubscriptionId: null,
      tierSlug: 'starter',
    })

    expect(amountDue).toBe('£149')
    expect(mockedGetStripe).not.toHaveBeenCalled()
  })

  it('builds a free-tier downgrade payload for expired app-created trials', () => {
    const updates = buildExpiredTrialDowngradeUpdates({
      slug: 'free',
      max_employees: 10,
      max_users: 2,
      can_export_csv: true,
      can_export_pdf: false,
      can_forecast: false,
      can_calendar: false,
      can_bulk_import: false,
      can_api_access: false,
      can_sso: false,
      can_audit_logs: false,
    })

    expect(updates).toEqual(
      expect.objectContaining({
        tier_slug: 'free',
        is_trial: false,
        trial_ends_at: null,
        subscription_status: 'none',
        current_period_end: null,
        max_employees: 10,
        max_users: 2,
        can_export_csv: true,
        can_bulk_import: false,
      })
    )
    expect(updates).toHaveProperty('updated_at')
  })
})
