/**
 * ArcJet Client
 *
 * Shared ArcJet instance with a default sliding-window rate limit rule.
 * Individual API routes can import this and call `aj.protect(request)` to
 * apply rate limiting before any business logic.
 *
 * Limits (adjust per route as needed):
 *   - Participants add/update: 60 requests / 60 s per IP
 *   - Default: 120 requests / 60 s per IP
 *
 * Environment variable required: ARCJET_KEY
 */

import arcjet, { slidingWindow } from '@arcjet/next'

export const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    slidingWindow({
      mode:      'LIVE',   // 'DRY_RUN' in dev if you want logs without blocking
      interval:  60,       // seconds
      max:       120,      // requests per interval per IP
    }),
  ],
})

/**
 * Stricter instance for write-heavy mutation endpoints (participant add/update).
 */
export const ajStrict = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    slidingWindow({
      mode:     'LIVE',
      interval: 60,
      max:      60,
    }),
  ],
})
