import { describe, expect, it } from 'vitest'
import {
  getRoleLabel,
  hasPermission,
  isOwnerOrAdmin,
  isPrivilegedRole,
  isValidRole,
  PERMISSIONS,
} from '@/lib/permissions'

describe('permissions roles', () => {
  it('recognizes owner as a valid role', () => {
    expect(isValidRole('owner')).toBe(true)
  })

  it('maps viewer to Employee label', () => {
    expect(getRoleLabel('viewer')).toBe('Employee')
  })

  it('treats owner and admin as user-management capable roles', () => {
    expect(isOwnerOrAdmin('owner')).toBe(true)
    expect(isOwnerOrAdmin('admin')).toBe(true)
    expect(isOwnerOrAdmin('manager')).toBe(false)
  })

  it('marks owner and admin as privileged roles for MFA', () => {
    expect(isPrivilegedRole('owner')).toBe(true)
    expect(isPrivilegedRole('admin')).toBe(true)
    expect(isPrivilegedRole('viewer')).toBe(false)
  })

  it('grants owner full permissions', () => {
    expect(hasPermission('owner', PERMISSIONS.USERS_MANAGE)).toBe(true)
    expect(hasPermission('owner', PERMISSIONS.SETTINGS_UPDATE)).toBe(true)
  })
})
