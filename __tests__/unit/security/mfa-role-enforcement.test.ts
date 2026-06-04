import { describe, expect, it } from 'vitest'
import { shouldEnforceMfaForRole } from '@/lib/security/mfa'

describe('MFA role enforcement policy', () => {
  it.each([
    ['owner', false],
    ['admin', false],
    ['viewer', true],
    ['manager', true],
    [null, true],
  ])('enforces MFA for privileged role=%s superadmin=%s', (role, isSuperadmin) => {
    expect(shouldEnforceMfaForRole(role, isSuperadmin)).toBe(true)
  })

  it.each([
    ['manager', false],
    ['viewer', false],
    [null, false],
    [undefined, false],
  ])('does not require MFA by default for non-privileged role=%s', (role, isSuperadmin) => {
    expect(shouldEnforceMfaForRole(role, isSuperadmin)).toBe(false)
  })
})
