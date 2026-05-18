// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'
import { getSentryDsn, isSentryRuntimeEnabled } from '@/lib/monitoring/sentry'

Sentry.init({
  dsn: getSentryDsn(),

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Sample 10% of transactions for performance monitoring
  // This reduces costs while still providing meaningful data
  tracesSampleRate: 0.1,

  // Disable in development to avoid noise
  enabled: isSentryRuntimeEnabled,
})
