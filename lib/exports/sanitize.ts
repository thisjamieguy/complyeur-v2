/**
 * @fileoverview CSV injection prevention for export functionality.
 * Phase 12: Exports & Reporting - Item #104 (CRITICAL)
 *
 * This module prevents CSV injection attacks by sanitizing cell values
 * before they're written to CSV files. When opened in Excel or other
 * spreadsheet applications, malicious formulas can execute arbitrary commands.
 *
 * SECURITY CONTEXT:
 * - CSV injection (aka formula injection) allows attackers to execute code
 * - A cell starting with =, +, -, @ can be interpreted as a formula
 * - Example attack: "=cmd|'/C calc'!A0" would open calculator on Windows
 * - Employee names come from user input and must be sanitized
 *
 * @see OWASP CSV Injection: https://owasp.org/www-community/attacks/CSV_Injection
 */

/**
 * Characters that can trigger formula execution in spreadsheet applications.
 * - '=' : Standard formula prefix
 * - '+' : Alternative formula prefix (Excel)
 * - '-' : Alternative formula prefix (Excel)
 * - '@' : Alternative formula prefix (Excel, also used in some DDE attacks)
 * - '\t' : Tab character (can be used in DDE payloads)
 * - '\r' : Carriage return (can break CSV parsing)
 * - '\n' : Newline (can break CSV parsing)
 */
const CSV_INJECTION_CHARS = ['=', '+', '-', '@', '\t', '\r', '\n'] as const

/**
 * Sanitizes a value for safe inclusion in a CSV file.
 *
 * Security measures applied:
 * 1. Handles null/undefined gracefully
 * 2. Prefixes dangerous characters with single quote (')
 * 3. Properly escapes embedded quotes
 * 4. Wraps values containing special characters in quotes
 *
 * The single quote prefix approach is recommended by OWASP and is
 * handled gracefully by Excel (displays as text, not formula).
 *
 * @param value - The value to sanitize
 * @returns Sanitized string safe for CSV inclusion
 *
 * @example
 * sanitizeCsvValue("=cmd|'/C calc'!A0")  // → "'=cmd|'/C calc'!A0"
 * sanitizeCsvValue("+1234567890")        // → "'+1234567890"
 * sanitizeCsvValue("-Revenue")           // → "'-Revenue"
 * sanitizeCsvValue("@SUM(A1:A10)")       // → "'@SUM(A1:A10)"
 * sanitizeCsvValue("John Smith")         // → "John Smith"
 * sanitizeCsvValue("O'Brien, Mary")      // → "\"O'Brien, Mary\""
 * sanitizeCsvValue("")                   // → ""
 * sanitizeCsvValue(null)                 // → ""
 */
export function sanitizeCsvValue(value: string | null | undefined): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return ''
  }

  // Convert to string (handles numbers, booleans, etc.)
  const stringValue = String(value)

  // Empty string needs no processing
  if (stringValue.length === 0) {
    return ''
  }

  // Check if first character is dangerous and prefix with single quote
  const firstChar = stringValue[0]
  if (CSV_INJECTION_CHARS.includes(firstChar as typeof CSV_INJECTION_CHARS[number])) {
    // Prefix with single quote to prevent formula interpretation
    // Then wrap in quotes if needed for special characters
    const sanitized = `'${stringValue}`
    if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')) {
      return `"${sanitized.replace(/"/g, '""')}"`
    }
    return sanitized
  }

  // For non-dangerous values, handle standard CSV escaping
  // Wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Escape existing quotes by doubling them
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  // Safe value, return as-is
  return stringValue
}

/**
 * Sanitizes an array of values for a CSV row.
 *
 * @param values - Array of values to sanitize
 * @returns Array of sanitized strings
 */
export function sanitizeCsvRow(values: (string | number | null | undefined)[]): string[] {
  return values.map((value) => {
    if (typeof value === 'number') {
      return value.toString()
    }
    return sanitizeCsvValue(value as string | null | undefined)
  })
}

/**
 * Joins sanitized values into a CSV row string.
 *
 * @param values - Array of values to join
 * @param delimiter - Column delimiter (default: comma)
 * @returns CSV row string
 */
export function toCsvRow(
  values: (string | number | null | undefined)[],
  delimiter: string = ','
): string {
  return sanitizeCsvRow(values).join(delimiter)
}

/**
 * Checks if a value contains potentially dangerous CSV injection characters.
 * Useful for validation or logging purposes.
 *
 * @param value - Value to check
 * @returns True if value could be a CSV injection attempt
 */
export function isPotentialCsvInjection(value: string | null | undefined): boolean {
  if (value === null || value === undefined || value.length === 0) {
    return false
  }

  const firstChar = value[0]
  return CSV_INJECTION_CHARS.includes(firstChar as typeof CSV_INJECTION_CHARS[number])
}
