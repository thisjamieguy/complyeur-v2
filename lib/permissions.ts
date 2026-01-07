// ===========================================
// PERMISSIONS SYSTEM
// MVP: Simple role-based lookup
// Future: Database-driven RBAC (no code changes needed)
// ===========================================

/**
 * All permission slugs in the system.
 * Format: [resource].[action]
 *
 * To add a new permission:
 * 1. Add it here
 * 2. Add to ROLE_PERMISSIONS for appropriate roles
 * 3. Use via usePermission() hook or hasPermission() function
 */
export const PERMISSIONS = {
  // Employees
  EMPLOYEES_CREATE: 'employees.create',
  EMPLOYEES_READ: 'employees.read',
  EMPLOYEES_UPDATE: 'employees.update',
  EMPLOYEES_DELETE: 'employees.delete',

  // Trips
  TRIPS_CREATE: 'trips.create',
  TRIPS_READ: 'trips.read',
  TRIPS_UPDATE: 'trips.update',
  TRIPS_DELETE: 'trips.delete',

  // Reports & Exports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT_CSV: 'reports.export.csv',
  REPORTS_EXPORT_PDF: 'reports.export.pdf',

  // Company Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_UPDATE: 'settings.update',

  // User/Team Management
  USERS_VIEW: 'users.view',
  USERS_INVITE: 'users.invite',
  USERS_MANAGE: 'users.manage',

  // Calendar
  CALENDAR_VIEW: 'calendar.view',
  CALENDAR_EDIT: 'calendar.edit',

  // Forecasting
  FORECAST_VIEW: 'forecast.view',
  FORECAST_CREATE: 'forecast.create',

  // Alerts
  ALERTS_VIEW: 'alerts.view',
  ALERTS_MANAGE: 'alerts.manage',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Valid user roles in the system
 * Must match the role column in profiles table
 */
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  VIEWER: 'viewer',
} as const;

// Role type matching the database schema (derived from ROLES)
export type UserRole = typeof ROLES[keyof typeof ROLES];

// ===========================================
// MVP ROLE DEFINITIONS
// When enterprise RBAC is needed, this becomes a database query
// ===========================================

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Admin: Full access to everything
  admin: Object.values(PERMISSIONS),

  // Manager: Can manage employees and trips, view reports, but not manage users/settings
  manager: [
    PERMISSIONS.EMPLOYEES_CREATE,
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.EMPLOYEES_UPDATE,
    PERMISSIONS.TRIPS_CREATE,
    PERMISSIONS.TRIPS_READ,
    PERMISSIONS.TRIPS_UPDATE,
    PERMISSIONS.TRIPS_DELETE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT_CSV,
    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.CALENDAR_EDIT,
    PERMISSIONS.FORECAST_VIEW,
    PERMISSIONS.FORECAST_CREATE,
    PERMISSIONS.ALERTS_VIEW,
    PERMISSIONS.ALERTS_MANAGE,
  ],

  // Viewer: Read-only access
  viewer: [
    PERMISSIONS.EMPLOYEES_READ,
    PERMISSIONS.TRIPS_READ,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.CALENDAR_VIEW,
    PERMISSIONS.FORECAST_VIEW,
    PERMISSIONS.ALERTS_VIEW,
  ],

  // -------------------------------------------------
  // FUTURE ROLES (uncomment when implementing RBAC)
  // -------------------------------------------------
  // owner: Object.values(PERMISSIONS),
  //
  // hr_manager: [
  //   PERMISSIONS.EMPLOYEES_CREATE,
  //   PERMISSIONS.EMPLOYEES_READ,
  //   PERMISSIONS.EMPLOYEES_UPDATE,
  //   PERMISSIONS.TRIPS_CREATE,
  //   PERMISSIONS.TRIPS_READ,
  //   PERMISSIONS.TRIPS_UPDATE,
  //   PERMISSIONS.REPORTS_VIEW,
  //   PERMISSIONS.REPORTS_EXPORT_CSV,
  //   PERMISSIONS.CALENDAR_VIEW,
  //   PERMISSIONS.CALENDAR_EDIT,
  //   PERMISSIONS.FORECAST_VIEW,
  //   PERMISSIONS.ALERTS_VIEW,
  //   PERMISSIONS.ALERTS_MANAGE,
  // ],
};

// ===========================================
// PERMISSION CHECK FUNCTIONS
// These are the ONLY functions to call for permission checks
// ===========================================

/**
 * Check if a user role has a specific permission
 * @param userRole - The user's role (from profile)
 * @param permission - The permission to check
 * @returns boolean
 *
 * @example
 * if (hasPermission(user.role, PERMISSIONS.EMPLOYEES_DELETE)) {
 *   // allow deletion
 * }
 */
export function hasPermission(
  userRole: string | undefined | null,
  permission: Permission
): boolean {
  if (!userRole) return false;
  const role = userRole as UserRole;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if user has ANY of the specified permissions
 * @example
 * hasAnyPermission(user.role, [PERMISSIONS.TRIPS_CREATE, PERMISSIONS.TRIPS_UPDATE])
 */
export function hasAnyPermission(
  userRole: string | undefined | null,
  permissions: Permission[]
): boolean {
  return permissions.some(p => hasPermission(userRole, p));
}

/**
 * Check if user has ALL of the specified permissions
 * @example
 * hasAllPermissions(user.role, [PERMISSIONS.EMPLOYEES_READ, PERMISSIONS.EMPLOYEES_UPDATE])
 */
export function hasAllPermissions(
  userRole: string | undefined | null,
  permissions: Permission[]
): boolean {
  return permissions.every(p => hasPermission(userRole, p));
}

/**
 * Get all permissions for a role (useful for debugging)
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Check if a role is a valid UserRole
 */
export function isValidRole(role: string | undefined | null): role is UserRole {
  if (!role) return false;
  return ['admin', 'manager', 'viewer'].includes(role);
}
