/**
 * Team-management permission tests.
 *
 * Verifies which roles can invite, manage, and view team members.
 * This is security-critical: only owner/admin should be able to
 * mutate team membership.
 */
import { describe, expect, it } from 'vitest'
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
  PERMISSIONS,
  ROLES,
} from '@/lib/permissions'

// ─── USERS_INVITE ────────────────────────────────────────────────────────────

describe('USERS_INVITE permission', () => {
  it('is granted to owner', () => {
    expect(hasPermission(ROLES.OWNER, PERMISSIONS.USERS_INVITE)).toBe(true)
  })

  it('is granted to admin', () => {
    expect(hasPermission(ROLES.ADMIN, PERMISSIONS.USERS_INVITE)).toBe(true)
  })

  it('is denied to manager', () => {
    expect(hasPermission(ROLES.MANAGER, PERMISSIONS.USERS_INVITE)).toBe(false)
  })

  it('is denied to viewer', () => {
    expect(hasPermission(ROLES.VIEWER, PERMISSIONS.USERS_INVITE)).toBe(false)
  })

  it('is denied to null role', () => {
    expect(hasPermission(null, PERMISSIONS.USERS_INVITE)).toBe(false)
  })

  it('is denied to undefined role', () => {
    expect(hasPermission(undefined, PERMISSIONS.USERS_INVITE)).toBe(false)
  })

  it('is denied to an unrecognised role string', () => {
    expect(hasPermission('superuser', PERMISSIONS.USERS_INVITE)).toBe(false)
  })
})

// ─── USERS_MANAGE ─────────────────────────────────────────────────────────────

describe('USERS_MANAGE permission', () => {
  it('is granted to owner', () => {
    expect(hasPermission(ROLES.OWNER, PERMISSIONS.USERS_MANAGE)).toBe(true)
  })

  it('is granted to admin', () => {
    expect(hasPermission(ROLES.ADMIN, PERMISSIONS.USERS_MANAGE)).toBe(true)
  })

  it('is denied to manager', () => {
    expect(hasPermission(ROLES.MANAGER, PERMISSIONS.USERS_MANAGE)).toBe(false)
  })

  it('is denied to viewer', () => {
    expect(hasPermission(ROLES.VIEWER, PERMISSIONS.USERS_MANAGE)).toBe(false)
  })

  it('is denied to null role', () => {
    expect(hasPermission(null, PERMISSIONS.USERS_MANAGE)).toBe(false)
  })
})

// ─── USERS_VIEW ──────────────────────────────────────────────────────────────

describe('USERS_VIEW permission', () => {
  it('is granted to owner', () => {
    expect(hasPermission(ROLES.OWNER, PERMISSIONS.USERS_VIEW)).toBe(true)
  })

  it('is granted to admin', () => {
    expect(hasPermission(ROLES.ADMIN, PERMISSIONS.USERS_VIEW)).toBe(true)
  })

  it('is denied to manager', () => {
    // Manager can view settings but cannot view the user list
    expect(hasPermission(ROLES.MANAGER, PERMISSIONS.USERS_VIEW)).toBe(false)
  })

  it('is denied to viewer', () => {
    expect(hasPermission(ROLES.VIEWER, PERMISSIONS.USERS_VIEW)).toBe(false)
  })
})

// ─── Role separation tests ────────────────────────────────────────────────────

describe('team permission role separation', () => {
  it('manager has SETTINGS_VIEW but no team-management permissions', () => {
    expect(hasPermission(ROLES.MANAGER, PERMISSIONS.SETTINGS_VIEW)).toBe(true)
    expect(hasPermission(ROLES.MANAGER, PERMISSIONS.USERS_INVITE)).toBe(false)
    expect(hasPermission(ROLES.MANAGER, PERMISSIONS.USERS_MANAGE)).toBe(false)
    expect(hasPermission(ROLES.MANAGER, PERMISSIONS.USERS_VIEW)).toBe(false)
  })

  it('viewer has SETTINGS_VIEW but no team-management permissions', () => {
    expect(hasPermission(ROLES.VIEWER, PERMISSIONS.SETTINGS_VIEW)).toBe(true)
    expect(hasPermission(ROLES.VIEWER, PERMISSIONS.USERS_INVITE)).toBe(false)
    expect(hasPermission(ROLES.VIEWER, PERMISSIONS.USERS_MANAGE)).toBe(false)
    expect(hasPermission(ROLES.VIEWER, PERMISSIONS.USERS_VIEW)).toBe(false)
  })

  it('owner has all three user permissions', () => {
    expect(hasAllPermissions(ROLES.OWNER, [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_INVITE,
      PERMISSIONS.USERS_MANAGE,
    ])).toBe(true)
  })

  it('admin has all three user permissions', () => {
    expect(hasAllPermissions(ROLES.ADMIN, [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_INVITE,
      PERMISSIONS.USERS_MANAGE,
    ])).toBe(true)
  })

  it('hasAnyPermission returns true for owner given any user permission', () => {
    expect(hasAnyPermission(ROLES.OWNER, [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_INVITE,
      PERMISSIONS.USERS_MANAGE,
    ])).toBe(true)
  })

  it('hasAnyPermission returns false for manager given any user permission', () => {
    expect(hasAnyPermission(ROLES.MANAGER, [
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.USERS_INVITE,
      PERMISSIONS.USERS_MANAGE,
    ])).toBe(false)
  })

  it('owner permission set contains all user permissions', () => {
    const ownerPerms = getPermissionsForRole(ROLES.OWNER)
    expect(ownerPerms).toContain(PERMISSIONS.USERS_VIEW)
    expect(ownerPerms).toContain(PERMISSIONS.USERS_INVITE)
    expect(ownerPerms).toContain(PERMISSIONS.USERS_MANAGE)
  })

  it('manager permission set contains no user permissions', () => {
    const managerPerms = getPermissionsForRole(ROLES.MANAGER)
    expect(managerPerms).not.toContain(PERMISSIONS.USERS_VIEW)
    expect(managerPerms).not.toContain(PERMISSIONS.USERS_INVITE)
    expect(managerPerms).not.toContain(PERMISSIONS.USERS_MANAGE)
  })
})
