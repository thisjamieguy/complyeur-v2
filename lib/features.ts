export function isSavedJobsEnabled(): boolean {
  return process.env.FEATURE_SAVED_JOBS === 'true'
}
