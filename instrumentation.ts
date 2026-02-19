import * as Sentry from '@sentry/nextjs'
import { installConsoleRedaction } from '@/lib/logger.mjs'

export async function register() {
  installConsoleRedaction()

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Fail-closed: Ensure CRON_SECRET is configured in production.
    // Dynamic import keeps cron-auth out of the edge bundle entirely.
    // SOC 2 Controls: CC6 (Logical Access), A1 (Availability)
    const { validateCronSecretConfigured } = await import('@/lib/security/cron-auth')
    validateCronSecretConfigured()

    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
