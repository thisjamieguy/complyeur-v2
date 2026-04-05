import { describe, test, expect } from 'vitest'
import {
  employeeIdSchema,
  gdprDeletionSchema,
  gdprAnonymizationSchema,
} from '@/lib/validations/gdpr'

const validUuid = '123e4567-e89b-12d3-a456-426614174000'

describe('employeeIdSchema', () => {
  test('accepts valid UUID', () => {
    expect(employeeIdSchema.parse(validUuid)).toBe(validUuid)
  })

  test('rejects non-UUID string', () => {
    expect(() => employeeIdSchema.parse('not-a-uuid')).toThrow()
  })

  test('rejects empty string', () => {
    expect(() => employeeIdSchema.parse('')).toThrow()
  })

  test('rejects numeric ID', () => {
    expect(() => employeeIdSchema.parse('12345')).toThrow()
  })
})

describe('gdprDeletionSchema', () => {
  test('accepts valid employeeId without reason', () => {
    const result = gdprDeletionSchema.parse({ employeeId: validUuid })
    expect(result.employeeId).toBe(validUuid)
    expect(result.reason).toBeUndefined()
  })

  test('accepts valid employeeId with reason', () => {
    const result = gdprDeletionSchema.parse({
      employeeId: validUuid,
      reason: 'Employee left the company',
    })
    expect(result.reason).toBe('Employee left the company')
  })

  test('trims whitespace from reason', () => {
    const result = gdprDeletionSchema.parse({
      employeeId: validUuid,
      reason: '  Left company  ',
    })
    expect(result.reason).toBe('Left company')
  })

  test('converts whitespace-only reason to undefined', () => {
    const result = gdprDeletionSchema.parse({
      employeeId: validUuid,
      reason: '   ',
    })
    expect(result.reason).toBeUndefined()
  })

  test('rejects reason exceeding 500 characters', () => {
    expect(() =>
      gdprDeletionSchema.parse({
        employeeId: validUuid,
        reason: 'a'.repeat(501),
      })
    ).toThrow('Reason must be less than 500 characters')
  })

  test('accepts reason exactly 500 characters', () => {
    const result = gdprDeletionSchema.parse({
      employeeId: validUuid,
      reason: 'a'.repeat(500),
    })
    expect(result.reason).toHaveLength(500)
  })

  test('rejects invalid employeeId', () => {
    expect(() =>
      gdprDeletionSchema.parse({ employeeId: 'invalid-id' })
    ).toThrow()
  })
})

describe('gdprAnonymizationSchema', () => {
  test('accepts valid employeeId without reason', () => {
    const result = gdprAnonymizationSchema.parse({ employeeId: validUuid })
    expect(result.employeeId).toBe(validUuid)
    expect(result.reason).toBeUndefined()
  })

  test('accepts valid employeeId with reason', () => {
    const result = gdprAnonymizationSchema.parse({
      employeeId: validUuid,
      reason: 'DSAR request',
    })
    expect(result.reason).toBe('DSAR request')
  })

  test('trims whitespace from reason', () => {
    const result = gdprAnonymizationSchema.parse({
      employeeId: validUuid,
      reason: '  DSAR  ',
    })
    expect(result.reason).toBe('DSAR')
  })

  test('converts whitespace-only reason to undefined', () => {
    const result = gdprAnonymizationSchema.parse({
      employeeId: validUuid,
      reason: '  ',
    })
    expect(result.reason).toBeUndefined()
  })

  test('rejects reason exceeding 500 characters', () => {
    expect(() =>
      gdprAnonymizationSchema.parse({
        employeeId: validUuid,
        reason: 'x'.repeat(501),
      })
    ).toThrow()
  })

  test('rejects invalid UUID', () => {
    expect(() =>
      gdprAnonymizationSchema.parse({ employeeId: 'not-a-uuid' })
    ).toThrow()
  })
})
