import { describe, expect, it, vi } from 'vitest'
import {
  entitlementUpdatesForTier,
  syncCompanyEntitlementsForTier,
  type TierRow,
} from '@/lib/admin/tier-admin'

function createTier(overrides: Partial<TierRow> = {}): TierRow {
  return {
    id: 'tier-1',
    slug: 'starter',
    display_name: 'Pro',
    description: 'Core plan',
    max_employees: 50,
    max_users: 5,
    can_export_csv: true,
    can_export_pdf: true,
    can_forecast: true,
    can_calendar: true,
    can_bulk_import: false,
    can_api_access: false,
    can_sso: false,
    can_audit_logs: false,
    stripe_price_id_monthly: 'price_monthly',
    stripe_price_id_annual: 'price_annual',
    sort_order: 20,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as TierRow
}

describe('tier admin entitlement sync', () => {
  it('builds entitlement updates from the tier capability fields', () => {
    const updates = entitlementUpdatesForTier(createTier({ can_bulk_import: true }))

    expect(updates).toEqual(
      expect.objectContaining({
        max_employees: 50,
        max_users: 5,
        can_export_csv: true,
        can_export_pdf: true,
        can_forecast: true,
        can_calendar: true,
        can_bulk_import: true,
        can_api_access: false,
        can_sso: false,
        can_audit_logs: false,
      })
    )
    expect(updates).toHaveProperty('updated_at')
  })

  it('updates company entitlements assigned to the changed tier', async () => {
    const eq = vi.fn(async () => ({ count: 3, error: null }))
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ update }))
    const supabase = { from }

    const count = await syncCompanyEntitlementsForTier(
      supabase as Parameters<typeof syncCompanyEntitlementsForTier>[0],
      createTier({ max_users: 8 })
    )

    expect(count).toBe(3)
    expect(from).toHaveBeenCalledWith('company_entitlements')
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ max_users: 8 }),
      { count: 'exact' }
    )
    expect(eq).toHaveBeenCalledWith('tier_slug', 'starter')
  })
})
