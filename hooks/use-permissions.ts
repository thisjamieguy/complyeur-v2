'use client';

import { useProfile } from './use-profile';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  type Permission,
} from '@/lib/permissions';

/**
 * Hook to check a single permission
 * Returns { allowed, isLoading } to handle loading state
 *
 * @example
 * const { allowed: canDelete, isLoading } = usePermission(PERMISSIONS.EMPLOYEES_DELETE);
 * {!isLoading && canDelete && <DeleteButton />}
 */
export function usePermission(permission: Permission): {
  allowed: boolean;
  isLoading: boolean;
} {
  const { profile, isLoading } = useProfile();
  return {
    allowed: hasPermission(profile?.role, permission),
    isLoading,
  };
}

/**
 * Hook to check if user has ANY of the permissions
 *
 * @example
 * const { allowed: canModify, isLoading } = useAnyPermission([
 *   PERMISSIONS.TRIPS_CREATE,
 *   PERMISSIONS.TRIPS_UPDATE
 * ]);
 */
export function useAnyPermission(permissions: Permission[]): {
  allowed: boolean;
  isLoading: boolean;
} {
  const { profile, isLoading } = useProfile();
  return {
    allowed: hasAnyPermission(profile?.role, permissions),
    isLoading,
  };
}

/**
 * Hook to check if user has ALL permissions
 *
 * @example
 * const { allowed: canFullyManage, isLoading } = useAllPermissions([
 *   PERMISSIONS.EMPLOYEES_READ,
 *   PERMISSIONS.EMPLOYEES_DELETE
 * ]);
 */
export function useAllPermissions(permissions: Permission[]): {
  allowed: boolean;
  isLoading: boolean;
} {
  const { profile, isLoading } = useProfile();
  return {
    allowed: hasAllPermissions(profile?.role, permissions),
    isLoading,
  };
}

/**
 * Hook to get the current user's role
 * Useful when you need to check multiple permissions or do role-based logic
 *
 * @example
 * const { role, isLoading } = useRole();
 * if (role === 'admin') { ... }
 */
export function useRole(): {
  role: string | undefined;
  isLoading: boolean;
} {
  const { profile, isLoading } = useProfile();
  return {
    role: profile?.role ?? undefined,
    isLoading,
  };
}
