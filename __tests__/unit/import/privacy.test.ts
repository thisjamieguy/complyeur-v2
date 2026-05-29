import { describe, expect, it } from 'vitest'
import { sanitizeImportResultForStorage } from '@/lib/import/privacy'

describe('import privacy helpers', () => {
  it('removes raw cell values and direct identifiers from persisted import results', () => {
    const result = sanitizeImportResultForStorage({
      success: false,
      employees_created: 0,
      employees_updated: 0,
      trips_created: 0,
      trips_skipped: 0,
      errors: [
        {
          row: 1,
          column: 'email',
          value: 'alice@example.com',
          message: 'Employee with email "alice@example.com" already exists, skipped',
          severity: 'error',
        },
      ],
      warnings: [
        {
          row: 2,
          column: 'first_name',
          value: 'Alice Example',
          message: 'Duplicate name "Alice Example" was auto-renamed',
          severity: 'warning',
        },
      ],
    })

    expect(result.errors[0]).toMatchObject({
      value: '',
      message: 'Employee with email "[redacted]" already exists, skipped',
    })
    expect(result.warnings[0]).toMatchObject({
      value: '',
      message: 'Duplicate name "[redacted]" was auto-renamed',
    })
    expect(JSON.stringify(result)).not.toContain('alice@example.com')
    expect(JSON.stringify(result)).not.toContain('Alice Example')
  })
})
