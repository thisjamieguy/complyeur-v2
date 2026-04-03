const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()

export const isSentryRuntimeEnabled = Boolean(sentryDsn) && process.env.NODE_ENV === 'production'

export const hasSentryBuildConfiguration =
  Boolean(process.env.SENTRY_AUTH_TOKEN?.trim()) &&
  Boolean(process.env.SENTRY_ORG?.trim()) &&
  Boolean(process.env.SENTRY_PROJECT?.trim())

export function getSentryDsn(): string | undefined {
  return sentryDsn || undefined
}
