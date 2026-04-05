import { describe, test, expect } from 'vitest'
import {
  companyIdSchema,
  updateEntitlementsSchema,
  extendTrialSchema,
  suspendCompanySchema,
  addNoteSchema,
  updateNoteSchema,
  noteIdSchema,
  createTierFormSchema,
  updateTierFormSchema,
  adminTierSlugParamSchema,
} from '@/lib/validations/admin'

const validUuid = '123e4567-e89b-12d3-a456-426614174000'

describe('companyIdSchema', () => {
  test('accepts valid UUID', () => expect(companyIdSchema.parse(validUuid)).toBe(validUuid))
  test('rejects non-UUID', () => expect(() => companyIdSchema.parse('not-uuid')).toThrow())
})

describe('updateEntitlementsSchema', () => {
  test('accepts empty object (all optional)', () => {
    expect(() => updateEntitlementsSchema.parse({})).not.toThrow()
  })

  test('accepts valid tier_slug', () => {
    const result = updateEntitlementsSchema.parse({ tier_slug: 'pro' })
    expect(result.tier_slug).toBe('pro')
  })

  test('rejects tier_slug exceeding 50 chars', () => {
    expect(() =>
      updateEntitlementsSchema.parse({ tier_slug: 'a'.repeat(51) })
    ).toThrow()
  })

  test('accepts null max_employees (unlimited)', () => {
    const result = updateEntitlementsSchema.parse({ max_employees: null })
    expect(result.max_employees).toBeNull()
  })

  test('accepts positive max_employees', () => {
    const result = updateEntitlementsSchema.parse({ max_employees: 100 })
    expect(result.max_employees).toBe(100)
  })

  test('rejects non-positive max_employees', () => {
    expect(() => updateEntitlementsSchema.parse({ max_employees: 0 })).toThrow()
  })

  test('rejects max_employees over 10000', () => {
    expect(() => updateEntitlementsSchema.parse({ max_employees: 10001 })).toThrow()
  })

  test('accepts null max_users', () => {
    const result = updateEntitlementsSchema.parse({ max_users: null })
    expect(result.max_users).toBeNull()
  })

  test('accepts feature flag booleans', () => {
    const result = updateEntitlementsSchema.parse({
      can_export_csv: true,
      can_export_pdf: false,
      can_forecast: true,
    })
    expect(result.can_export_csv).toBe(true)
    expect(result.can_export_pdf).toBe(false)
  })

  test('trims and returns undefined for empty override_notes', () => {
    const result = updateEntitlementsSchema.parse({ override_notes: '   ' })
    expect(result.override_notes).toBeUndefined()
  })

  test('trims override_notes', () => {
    const result = updateEntitlementsSchema.parse({ override_notes: '  note  ' })
    expect(result.override_notes).toBe('note')
  })

  test('rejects override_notes over 500 chars', () => {
    expect(() =>
      updateEntitlementsSchema.parse({ override_notes: 'a'.repeat(501) })
    ).toThrow()
  })
})

describe('extendTrialSchema', () => {
  test('accepts valid days', () => {
    const result = extendTrialSchema.parse({ days: 30 })
    expect(result.days).toBe(30)
  })

  test('accepts maximum 365 days', () => {
    expect(() => extendTrialSchema.parse({ days: 365 })).not.toThrow()
  })

  test('rejects 0 days', () => {
    expect(() => extendTrialSchema.parse({ days: 0 })).toThrow()
  })

  test('rejects over 365 days', () => {
    expect(() => extendTrialSchema.parse({ days: 366 })).toThrow()
  })

  test('rejects fractional days', () => {
    expect(() => extendTrialSchema.parse({ days: 1.5 })).toThrow()
  })

  test('trims and returns undefined for empty reason', () => {
    const result = extendTrialSchema.parse({ days: 30, reason: '   ' })
    expect(result.reason).toBeUndefined()
  })

  test('trims reason whitespace', () => {
    const result = extendTrialSchema.parse({ days: 30, reason: '  Sales deal  ' })
    expect(result.reason).toBe('Sales deal')
  })

  test('accepts without reason', () => {
    const result = extendTrialSchema.parse({ days: 30 })
    expect(result.reason).toBeUndefined()
  })
})

describe('suspendCompanySchema', () => {
  test('accepts valid reason', () => {
    const result = suspendCompanySchema.parse({ reason: 'Terms violation' })
    expect(result.reason).toBe('Terms violation')
  })

  test('trims whitespace from reason', () => {
    const result = suspendCompanySchema.parse({ reason: '  Payment failure  ' })
    expect(result.reason).toBe('Payment failure')
  })

  test('rejects empty reason', () => {
    expect(() => suspendCompanySchema.parse({ reason: '' })).toThrow()
  })

  test('rejects reason over 500 chars', () => {
    expect(() => suspendCompanySchema.parse({ reason: 'a'.repeat(501) })).toThrow()
  })
})

describe('addNoteSchema', () => {
  test('accepts valid note', () => {
    const result = addNoteSchema.parse({ note_content: 'Customer requested feature' })
    expect(result.note_content).toBe('Customer requested feature')
  })

  test('trims whitespace from note_content', () => {
    const result = addNoteSchema.parse({ note_content: '  test note  ' })
    expect(result.note_content).toBe('test note')
  })

  test('accepts all valid categories', () => {
    const categories = ['general', 'support', 'billing', 'custom_deal', 'feature_request',
      'bug_report', 'churn_risk', 'onboarding', 'upsell_opportunity']
    for (const category of categories) {
      const result = addNoteSchema.parse({ note_content: 'Note', category })
      expect(result.category).toBe(category)
    }
  })

  test('defaults category to general', () => {
    const result = addNoteSchema.parse({ note_content: 'Note' })
    expect(result.category).toBe('general')
  })

  test('defaults is_pinned to false', () => {
    const result = addNoteSchema.parse({ note_content: 'Note' })
    expect(result.is_pinned).toBe(false)
  })

  test('accepts is_pinned true', () => {
    const result = addNoteSchema.parse({ note_content: 'Note', is_pinned: true })
    expect(result.is_pinned).toBe(true)
  })

  test('accepts null follow_up_date', () => {
    const result = addNoteSchema.parse({ note_content: 'Note', follow_up_date: null })
    expect(result.follow_up_date).toBeNull()
  })

  test('accepts valid ISO datetime for follow_up_date', () => {
    const result = addNoteSchema.parse({
      note_content: 'Note',
      follow_up_date: '2025-06-01T09:00:00.000Z',
    })
    expect(result.follow_up_date).toBeTruthy()
  })

  test('rejects invalid follow_up_date', () => {
    expect(() =>
      addNoteSchema.parse({ note_content: 'Note', follow_up_date: 'not-a-date' })
    ).toThrow()
  })

  test('rejects empty note_content', () => {
    expect(() => addNoteSchema.parse({ note_content: '' })).toThrow()
  })

  test('rejects note over 2000 chars', () => {
    expect(() =>
      addNoteSchema.parse({ note_content: 'a'.repeat(2001) })
    ).toThrow()
  })
})

describe('updateNoteSchema', () => {
  test('accepts empty object (all optional)', () => {
    expect(() => updateNoteSchema.parse({})).not.toThrow()
  })

  test('trims note_content', () => {
    const result = updateNoteSchema.parse({ note_content: '  updated note  ' })
    expect(result.note_content).toBe('updated note')
  })

  test('accepts partial update', () => {
    const result = updateNoteSchema.parse({ is_pinned: true })
    expect(result.is_pinned).toBe(true)
    expect(result.note_content).toBeUndefined()
  })
})

describe('noteIdSchema', () => {
  test('accepts valid UUID', () => expect(noteIdSchema.parse(validUuid)).toBe(validUuid))
  test('rejects invalid UUID', () => expect(() => noteIdSchema.parse('bad-id')).toThrow())
})

describe('adminTierSlugParamSchema', () => {
  test('accepts valid slug', () => {
    expect(adminTierSlugParamSchema.parse('pro')).toBe('pro')
    expect(adminTierSlugParamSchema.parse('free-tier')).toBe('free-tier')
    expect(adminTierSlugParamSchema.parse('enterprise_v2')).toBe('enterprise_v2')
  })

  test('rejects uppercase letters', () => {
    expect(() => adminTierSlugParamSchema.parse('Pro')).toThrow()
  })

  test('rejects starting with hyphen', () => {
    expect(() => adminTierSlugParamSchema.parse('-pro')).toThrow()
  })

  test('rejects empty string', () => {
    expect(() => adminTierSlugParamSchema.parse('')).toThrow()
  })
})

describe('createTierFormSchema', () => {
  const validTier = {
    slug: 'pro',
    display_name: 'Pro Plan',
    max_employees: 100,
    max_users: 10,
    can_export_csv: true,
    can_export_pdf: true,
    can_forecast: true,
    can_calendar: true,
    can_bulk_import: true,
    can_api_access: false,
    can_sso: false,
    can_audit_logs: false,
    stripe_price_id_monthly: null,
    stripe_price_id_annual: null,
    sort_order: 1,
    is_active: true,
  }

  test('accepts valid tier', () => {
    const result = createTierFormSchema.parse(validTier)
    expect(result.slug).toBe('pro')
    expect(result.display_name).toBe('Pro Plan')
  })

  test('accepts valid Stripe price IDs', () => {
    const result = createTierFormSchema.parse({
      ...validTier,
      stripe_price_id_monthly: 'price_abc123',
      stripe_price_id_annual: 'price_xyz789',
    })
    expect(result.stripe_price_id_monthly).toBe('price_abc123')
  })

  test('rejects invalid Stripe price ID format', () => {
    expect(() =>
      createTierFormSchema.parse({ ...validTier, stripe_price_id_monthly: 'not_a_price' })
    ).toThrow()
  })

  test('converts empty string Stripe price to null', () => {
    const result = createTierFormSchema.parse({ ...validTier, stripe_price_id_monthly: '' })
    expect(result.stripe_price_id_monthly).toBeNull()
  })

  test('trims description whitespace', () => {
    const result = createTierFormSchema.parse({ ...validTier, description: '  A description  ' })
    expect(result.description).toBe('A description')
  })
})

describe('updateTierFormSchema', () => {
  const validUpdate = {
    display_name: 'Updated Plan',
    max_employees: 200,
    max_users: 20,
    can_export_csv: true,
    can_export_pdf: false,
    can_forecast: true,
    can_calendar: false,
    can_bulk_import: true,
    can_api_access: true,
    can_sso: false,
    can_audit_logs: false,
    stripe_price_id_monthly: null,
    stripe_price_id_annual: null,
    sort_order: 2,
    is_active: true,
  }

  test('accepts valid update', () => {
    const result = updateTierFormSchema.parse(validUpdate)
    expect(result.display_name).toBe('Updated Plan')
  })
})
