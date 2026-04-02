import { describe, expect, it } from 'vitest'
import { createTierFormSchema, updateTierFormSchema } from '@/lib/validations/admin'

const validTierFields = {
  display_name: 'Basic',
  description: 'Entry tier',
  max_employees: 10,
  max_users: 1,
  can_export_csv: true,
  can_export_pdf: false,
  can_forecast: false,
  can_calendar: false,
  can_bulk_import: false,
  can_api_access: false,
  can_sso: false,
  can_audit_logs: false,
  stripe_price_id_monthly: null,
  stripe_price_id_annual: null,
  sort_order: 1,
  is_active: true,
} as const

describe('admin tier validation', () => {
  it('accepts null Stripe price IDs for updates', () => {
    const result = updateTierFormSchema.safeParse(validTierFields)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.stripe_price_id_monthly).toBeNull()
      expect(result.data.stripe_price_id_annual).toBeNull()
    }
  })

  it('normalizes blank Stripe price IDs to null on create', () => {
    const result = createTierFormSchema.safeParse({
      slug: 'basic',
      ...validTierFields,
      stripe_price_id_monthly: '   ',
      stripe_price_id_annual: '',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.stripe_price_id_monthly).toBeNull()
      expect(result.data.stripe_price_id_annual).toBeNull()
    }
  })

  it('rejects malformed Stripe price IDs', () => {
    const result = updateTierFormSchema.safeParse({
      ...validTierFields,
      stripe_price_id_monthly: 'not-a-price-id',
    })

    expect(result.success).toBe(false)
  })
})
