/**
 * @fileoverview GDPR & Privacy Tools
 *
 * This module provides comprehensive GDPR compliance tools for ComplyEur:
 *
 * - Audit Logging: Tamper-evident logging with hash chain integrity
 * - DSAR Export: Data Subject Access Request ZIP generation
 * - Soft Delete: 30-day recovery period before permanent deletion
 * - Anonymization: Irreversible PII removal while preserving trip data
 * - Retention: Automatic data purge based on company policy
 */

// Audit Logging
export {
  logGdprAction,
  verifyAuditChain,
  getGdprAuditLog,
  type GdprAction,
  type GdprEntityType,
  type AuditEntry,
  type DsarExportDetails,
  type AnonymizeDetails,
  type SoftDeleteDetails,
  type RestoreDetails,
  type HardDeleteDetails,
  type AutoPurgeDetails,
} from './audit'

// DSAR Export
export {
  generateDsarExport,
  type DsarExportResult,
  type DsarExportError,
} from './dsar-export'

// Soft Delete
export {
  softDeleteEmployee,
  restoreEmployee,
  getDeletedEmployees,
  hardDeleteEmployee,
  RECOVERY_PERIOD_DAYS,
  type SoftDeleteResult,
  type SoftDeleteError,
  type RestoreResult,
  type RestoreError,
  type DeletedEmployee,
} from './soft-delete'

// Anonymization
export {
  anonymizeEmployee,
  generateAnonymizedName,
  isAnonymizedName,
  type AnonymizeResult,
  type AnonymizeError,
} from './anonymize'

// Retention
export {
  runRetentionPurge,
  getRetentionStats,
  type PurgeResult,
  type RetentionStats,
} from './retention'
