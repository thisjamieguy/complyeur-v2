import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveRenewalAmountDue } from '@/app/api/cron/billing/route'
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
})
