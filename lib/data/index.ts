/**
 * @fileoverview Server-side data fetching layer.
 *
 * This module provides cached data fetching functions for server components.
 * All functions use React's cache() for request-level deduplication.
 *
 * @version 2025-01-09
 */

export {
  getEmployeesWithTrips,
  getEmployeeComplianceData,
  getEmployeeComplianceDataPaginated,
  getEmployeeStats,
  getEmployeeById,
  getEmployeeCount,
  type PaginationParams,
  type PaginatedEmployeeResult,
} from './employees'
