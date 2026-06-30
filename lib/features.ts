export function isSavedJobsEnabled(): boolean {
  return process.env.FEATURE_SAVED_JOBS === 'true'
}

export function isInteractiveCalendarEnabled(): boolean {
  const configured = process.env.ENABLE_INTERACTIVE_CALENDAR
  if (configured !== undefined) {
    return configured === 'true'
  }

  return process.env.NODE_ENV !== 'production'
}
