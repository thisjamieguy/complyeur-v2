import { describe, test, expect } from 'vitest'
import {
  companyNameSchema,
  addEmployeeSchema,
  inviteTeamSchema,
} from '@/lib/validations/onboarding'

describe('companyNameSchema', () => {
  test('accepts valid company name', () => {
    const result = companyNameSchema.parse({ companyName: 'Acme Corp' })
    expect(result.companyName).toBe('Acme Corp')
  })

  test('accepts company name with business characters', () => {
    const result = companyNameSchema.parse({ companyName: 'Smith & Jones (UK) Ltd.' })
    expect(result.companyName).toBe('Smith & Jones (UK) Ltd.')
  })

  test('trims whitespace', () => {
    const result = companyNameSchema.parse({ companyName: '  Acme  ' })
    expect(result.companyName).toBe('Acme')
  })

  test('rejects empty string', () => {
    expect(() => companyNameSchema.parse({ companyName: '' })).toThrow()
  })

  test('rejects single character', () => {
    expect(() => companyNameSchema.parse({ companyName: 'A' })).toThrow()
  })

  test('rejects name exceeding 100 characters', () => {
    expect(() =>
      companyNameSchema.parse({ companyName: 'A'.repeat(101) })
    ).toThrow()
  })

  test('rejects name with invalid characters', () => {
    expect(() =>
      companyNameSchema.parse({ companyName: 'Acme<Corp>' })
    ).toThrow('Company name contains invalid characters')
  })

  test('accepts exactly 2 characters', () => {
    expect(() => companyNameSchema.parse({ companyName: 'AB' })).not.toThrow()
  })

  test('accepts exactly 100 characters', () => {
    expect(() =>
      companyNameSchema.parse({ companyName: 'A'.repeat(100) })
    ).not.toThrow()
  })
})

describe('addEmployeeSchema', () => {
  test('accepts valid employee with uk_citizen', () => {
    const result = addEmployeeSchema.parse({
      name: 'John Smith',
      nationalityType: 'uk_citizen',
    })
    expect(result.name).toBe('John Smith')
    expect(result.nationalityType).toBe('uk_citizen')
  })

  test('accepts eu_schengen_citizen', () => {
    const result = addEmployeeSchema.parse({
      name: 'Marie Dupont',
      nationalityType: 'eu_schengen_citizen',
    })
    expect(result.nationalityType).toBe('eu_schengen_citizen')
  })

  test('accepts rest_of_world', () => {
    const result = addEmployeeSchema.parse({
      name: 'Raj Patel',
      nationalityType: 'rest_of_world',
    })
    expect(result.nationalityType).toBe('rest_of_world')
  })

  test('trims whitespace from name', () => {
    const result = addEmployeeSchema.parse({
      name: '  John Smith  ',
      nationalityType: 'uk_citizen',
    })
    expect(result.name).toBe('John Smith')
  })

  test('rejects empty name', () => {
    expect(() =>
      addEmployeeSchema.parse({ name: '', nationalityType: 'uk_citizen' })
    ).toThrow()
  })

  test('rejects single character name', () => {
    expect(() =>
      addEmployeeSchema.parse({ name: 'J', nationalityType: 'uk_citizen' })
    ).toThrow()
  })

  test('rejects name exceeding 100 characters', () => {
    expect(() =>
      addEmployeeSchema.parse({
        name: 'A'.repeat(101),
        nationalityType: 'uk_citizen',
      })
    ).toThrow()
  })

  test('rejects invalid nationality type', () => {
    expect(() =>
      addEmployeeSchema.parse({ name: 'John Smith', nationalityType: 'american' })
    ).toThrow()
  })
})

describe('inviteTeamSchema', () => {
  test('accepts empty emails array', () => {
    const result = inviteTeamSchema.parse({ emails: [] })
    expect(result.emails).toEqual([])
  })

  test('accepts valid email addresses', () => {
    const result = inviteTeamSchema.parse({
      emails: ['alice@example.com', 'bob@example.com'],
    })
    expect(result.emails).toHaveLength(2)
  })

  test('normalises emails to lowercase', () => {
    const result = inviteTeamSchema.parse({
      emails: ['Alice@EXAMPLE.COM'],
    })
    expect(result.emails[0]).toBe('alice@example.com')
  })

  test('accepts empty strings in the array', () => {
    const result = inviteTeamSchema.parse({ emails: ['', ''] })
    expect(result.emails).toEqual(['', ''])
  })

  test('accepts up to 3 emails', () => {
    const result = inviteTeamSchema.parse({
      emails: ['a@a.com', 'b@b.com', 'c@c.com'],
    })
    expect(result.emails).toHaveLength(3)
  })

  test('rejects more than 3 emails', () => {
    expect(() =>
      inviteTeamSchema.parse({
        emails: ['a@a.com', 'b@b.com', 'c@c.com', 'd@d.com'],
      })
    ).toThrow()
  })

  test('rejects invalid email format', () => {
    expect(() =>
      inviteTeamSchema.parse({ emails: ['not-an-email'] })
    ).toThrow()
  })
})
