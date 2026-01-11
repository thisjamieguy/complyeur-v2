/**
 * Application configuration
 * Controls runtime behavior like maintenance mode
 */
export const config = {
  maintenanceMode: process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true',
}
