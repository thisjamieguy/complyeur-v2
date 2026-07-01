export function isSavedJobsEnabled(): boolean {
  return process.env.FEATURE_SAVED_JOBS === 'true'
}

interface InteractiveCalendarOptions {
  globalEnabled?: boolean
}

function isEmailAllowlisted(email: string | null | undefined, allowlist: string | undefined): boolean {
  if (!email || !allowlist) return false

  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return false

  return allowlist
    .split(/[,\s;]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalizedEmail)
}

export function isInteractiveCalendarEnabled(
  userEmail?: string | null,
  options: InteractiveCalendarOptions = {}
): boolean {
  if (options.globalEnabled === true) {
    return true
  }

  if (isEmailAllowlisted(userEmail, process.env.INTERACTIVE_CALENDAR_ALLOWED_EMAILS)) {
    return true
  }

  if (options.globalEnabled === false) {
    return false
  }

  const configured = process.env.ENABLE_INTERACTIVE_CALENDAR
  if (configured !== undefined) {
    return configured === 'true'
  }

  return process.env.NODE_ENV !== 'production'
}
