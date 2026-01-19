import * as Sentry from '@sentry/nextjs'
import { installConsoleRedaction } from '@/lib/logger.mjs'
import { validateCronSecretConfigured } from '@/lib/security/cron-auth'

export async function register() {
  installConsoleRedaction()

  // Fail-closed: Ensure CRON_SECRET is configured in production
  // This runs at boot time, preventing startup if misconfigured
  // SOC 2 Controls: CC6 (Logical Access), A1 (Availability)
  validateCronSecretConfigured()

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
