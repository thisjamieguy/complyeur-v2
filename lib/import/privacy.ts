import type { ImportResult, ValidationError } from '@/types/import'

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const QUOTED_VALUE_PATTERN = /"[^"]{1,200}"/g

function sanitizeMessage(message: string): string {
  return message
    .replace(EMAIL_PATTERN, '[redacted-email]')
    .replace(QUOTED_VALUE_PATTERN, '"[redacted]"')
}

export function sanitizeValidationErrorsForStorage(
  entries: ValidationError[]
): ValidationError[] {
  return entries.map((entry) => ({
    ...entry,
    value: '',
    message: sanitizeMessage(entry.message),
  }))
}

export function sanitizeImportResultForStorage<T extends Partial<ImportResult>>(
  result: T
): T & Pick<ImportResult, 'errors' | 'warnings'> {
  const errors = Array.isArray(result.errors) ? result.errors : []
  const warnings = Array.isArray(result.warnings) ? result.warnings : []

  return {
    ...result,
    errors: sanitizeValidationErrorsForStorage(errors),
    warnings: sanitizeValidationErrorsForStorage(warnings),
  }
}
