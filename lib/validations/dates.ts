/**
 * Date validation helpers for trip and compliance calculations
 */

/**
 * Check if a date range is valid (end >= start)
 */
export function isValidDateRange(start: Date, end: Date): boolean {
  return end >= start
}

/**
 * Check if a date is in the past beyond a threshold
 * @param date - The date to check
 * @param maxDaysBack - Maximum allowed days in the past (default: 180)
 * @returns true if the date is too far in the past
 */
export function isDateTooFarInPast(date: Date, maxDaysBack: number = 180): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const threshold = new Date(today)
  threshold.setDate(threshold.getDate() - maxDaysBack)

  return date < threshold
}

/**
 * Check if a date is in the future beyond a threshold
 * @param date - The date to check
 * @param maxDaysForward - Maximum allowed days in the future (default: 30)
 * @returns true if the date is too far in the future
 */
export function isDateTooFarInFuture(date: Date, maxDaysForward: number = 30): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const threshold = new Date(today)
  threshold.setDate(threshold.getDate() + maxDaysForward)

  return date > threshold
}

/**
 * Calculate the number of days in a trip (inclusive of both dates)
 * Entry and exit dates both count as presence days per Schengen rules
 */
export function getTripDurationDays(start: Date, end: Date): number {
  const startDate = new Date(start)
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(end)
  endDate.setHours(0, 0, 0, 0)

  const diffTime = endDate.getTime() - startDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // Both entry and exit days count (inclusive)
  return diffDays + 1
}

/**
 * Parse a date string to Date object safely
 * Handles ISO strings and YYYY-MM-DD formats
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString) return null

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return null

  return date
}

/**
 * Format a date for display (e.g., "15 Jan 2025")
 */
export function formatDateForDisplay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Get today's date as an ISO string (YYYY-MM-DD)
 */
export function getTodayISOString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Check if trip duration exceeds maximum (warn but don't block)
 * Schengen limit is 90 days, but a single trip could theoretically be longer
 * @returns warning message if duration is concerning, null otherwise
 */
export function checkTripDurationWarning(start: Date, end: Date): string | null {
  const days = getTripDurationDays(start, end)

  if (days > 180) {
    return `This trip is ${days} days long. Trips cannot exceed 180 days.`
  }

  if (days > 90) {
    return `This trip is ${days} days long, which exceeds the 90-day Schengen limit. Are you sure this is correct?`
  }

  return null
}

/**
 * Validate that a date string is a valid ISO date format
 */
export function isValidISODate(dateString: string): boolean {
  if (!dateString) return false

  // Check format matches YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) return false

  // Check it parses to a valid date
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return false

  // Ensure the date string matches what we get when converting back
  // This catches things like 2025-02-31 which would become 2025-03-03
  const [year, month, day] = dateString.split('-').map(Number)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}
