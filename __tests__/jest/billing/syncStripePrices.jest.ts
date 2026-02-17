import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { syncStripePrices } from '@/scripts/syncStripePrices'
import type { Database } from '@/types/database'

function createStripeMock() {
  return {
    prices: {
      retrieve: jest.fn().mockResolvedValue({
        id: 'price_mock',
        active: true,
      }),
    },
  } as unknown as Pick<Stripe, 'prices'>
}

function createSupabaseMock(
  tier:
    | {
        slug: string
        stripe_price_id_monthly: string | null
        stripe_price_id_annual: string | null
      }
    | null
) {
  const maybeSingle = jest.fn().mockResolvedValue({
    data: tier,
    error: null,
  })
  const selectEq = jest.fn().mockReturnValue({ maybeSingle })
  const select = jest.fn().mockReturnValue({ eq: selectEq })

  const updateEq = jest.fn().mockResolvedValue({ error: null })
  const update = jest.fn().mockReturnValue({ eq: updateEq })

  const from = jest.fn().mockReturnValue({
    select,
    update,
  })

  type SupabaseFromOnly = Pick<SupabaseClient<Database>, 'from'>

  return {
    supabase: {
      from,
    } as unknown as SupabaseFromOnly,
    update,
    updateEq,
  }
}

describe('syncStripePrices', () => {
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('updates expected tier rows for changed prices', async () => {
    const stripe = createStripeMock()
    const { supabase, update } = createSupabaseMock({
      slug: 'starter',
      stripe_price_id_monthly: 'price_old_monthly',
      stripe_price_id_annual: 'price_old_annual',
    })

    const result = await syncStripePrices(
      {
        starter: 'price_new_monthly',
      },
      {
        interval: 'monthly',
        dryRun: false,
      },
      {
        stripe,
        supabase,
        logger,
      }
    )

    expect(result.failed).toHaveLength(0)
    expect(result.updated).toHaveLength(1)
    expect(update).toHaveBeenCalledWith({
      stripe_price_id_monthly: 'price_new_monthly',
    })
  })

  it('skips updates when price IDs are unchanged', async () => {
    const stripe = createStripeMock()
    const { supabase, update } = createSupabaseMock({
      slug: 'starter',
      stripe_price_id_monthly: 'price_same',
      stripe_price_id_annual: null,
    })

    const result = await syncStripePrices(
      {
        starter: 'price_same',
      },
      {
        interval: 'monthly',
        dryRun: false,
      },
      {
        stripe,
        supabase,
        logger,
      }
    )

    expect(result.updated).toHaveLength(0)
    expect(result.skipped).toEqual(['starter'])
    expect(update).not.toHaveBeenCalled()
  })

  it('reports failures when the tier slug does not exist', async () => {
    const stripe = createStripeMock()
    const { supabase } = createSupabaseMock(null)

    const result = await syncStripePrices(
      {
        missing_plan: 'price_1Missing',
      },
      {
        interval: 'monthly',
        dryRun: false,
      },
      {
        stripe,
        supabase,
        logger,
      }
    )

    expect(result.updated).toHaveLength(0)
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].slug).toBe('missing_plan')
    expect(result.failed[0].reason).toContain('tier not found')
  })
})
