/**
 * @fileoverview Error classes for compliance calculation failures.
 *
 * These typed errors provide specific information about what went wrong,
 * allowing callers to handle different error conditions appropriately.
 *
 * @version 2025-01-07
 */

/**
 * Base error for all compliance calculation errors.
 * Extend this for specific error types.
 */
export class ComplianceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComplianceError';
    // Maintains proper stack trace for where our error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when a trip has invalid data.
 *
 * @example
 * throw new InvalidTripError('entryDate', undefined, 'Entry date is required');
 */
export class InvalidTripError extends ComplianceError {
  constructor(
    public readonly field: 'entryDate' | 'exitDate' | 'country' | 'dates',
    public readonly value: unknown,
    public readonly reason: string
  ) {
    super(`Invalid trip ${field}: ${reason}`);
    this.name = 'InvalidTripError';
  }
}

/**
 * Thrown when date range is invalid (e.g., exit before entry).
 *
 * @example
 * throw new InvalidDateRangeError(new Date('2025-01-10'), new Date('2025-01-05'));
 */
export class InvalidDateRangeError extends ComplianceError {
  constructor(
    public readonly entryDate: Date,
    public readonly exitDate: Date
  ) {
    super(
      `Invalid date range: exit (${exitDate.toISOString()}) is before entry (${entryDate.toISOString()})`
    );
    this.name = 'InvalidDateRangeError';
  }
}

/**
 * Thrown when country code is not recognized.
 *
 * @example
 * throw new UnknownCountryError('XX');
 */
export class UnknownCountryError extends ComplianceError {
  constructor(public readonly countryCode: string) {
    super(`Unknown country code: "${countryCode}". Use ISO 3166-1 alpha-2 codes.`);
    this.name = 'UnknownCountryError';
  }
}

/**
 * Thrown when reference date is invalid for the operation.
 *
 * @example
 * throw new InvalidReferenceDateError(invalidDate, 'Reference date must be a valid Date object');
 */
export class InvalidReferenceDateError extends ComplianceError {
  constructor(
    public readonly referenceDate: Date | null | undefined,
    public readonly reason: string
  ) {
    super(`Invalid reference date: ${reason}`);
    this.name = 'InvalidReferenceDateError';
  }
}

/**
 * Thrown when compliance configuration is invalid.
 *
 * @example
 * throw new InvalidConfigError('thresholds.amber', 'Amber threshold must be less than green threshold');
 */
export class InvalidConfigError extends ComplianceError {
  constructor(
    public readonly configKey: string,
    public readonly reason: string
  ) {
    super(`Invalid configuration "${configKey}": ${reason}`);
    this.name = 'InvalidConfigError';
  }
}
