// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Sample 10% of transactions for performance monitoring
  // This reduces costs while still providing meaningful data
  tracesSampleRate: 0.1,

  // Session replay sampling: 5% of sessions, 100% when errors occur
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  // Disable in development to avoid noise
  enabled: process.env.NODE_ENV === 'production',

  // Integrate with existing error boundary
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
})
