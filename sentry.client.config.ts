import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 0.01, // Capture 1% of transactions in production

  // Set sampling rate for profiling
  profilesSampleRate: 0.01, // Capture 1% of profiles

  // Enable replay to capture user sessions on errors
  replaysSessionSampleRate: 0.001, // 0.1% of sessions
  replaysOnErrorSampleRate: 0.5, // 50% of sessions with errors

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
})
