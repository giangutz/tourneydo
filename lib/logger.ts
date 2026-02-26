/**
 * Structured Logger (Pino)
 *
 * Singleton logger for server-side code. Outputs structured JSON in production
 * and pretty-printed lines in development. Sensitive fields are redacted before
 * emission.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info({ userId, tournamentId }, 'Bracket generated')
 *   logger.error({ error }, 'Failed to save scores')
 *
 * Child loggers (carry shared context):
 *   const log = logger.child({ module: 'save-match-scores' })
 *   log.warn({ matchId }, 'Conflict detected')
 */

import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

// pino.transport() spawns a worker thread, which Next.js App Router cannot
// resolve at runtime. Instead we use pino-pretty as a synchronous Transform
// stream in development (no worker threads required). In production we let
// pino write plain JSON to stdout — the default and safest option.
function buildStream(): pino.DestinationStream | undefined {
  if (!isDev) return undefined
  try {
    // Dynamic require keeps the bundler from pulling pino-pretty into the
    // client bundle; it is only resolved at runtime on the server.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pretty = require('pino-pretty')
    const fn = pretty.default ?? pretty
    return fn({
      colorize: true,
      translateTime: 'SYS:HH:MM:ss',
      ignore: 'pid,hostname',
      sync: true, // synchronous mode — no worker thread
    }) as pino.DestinationStream
  } catch {
    // pino-pretty not installed — fall back to plain JSON
    return undefined
  }
}

const stream = buildStream()

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),

    // Redact sensitive field paths from all log lines
    redact: {
      paths: [
        'password',
        'token',
        'accessToken',
        'refreshToken',
        'apiKey',
        'secret',
        'creditCard',
        '*.password',
        '*.token',
        '*.apiKey',
      ],
      censor: '[REDACTED]',
    },

    // Base fields present on every log line
    base: {
      env: process.env.NODE_ENV ?? 'development',
    },

    // Serialize Error objects to include message + stack
    serializers: {
      error: pino.stdSerializers.err,
      err: pino.stdSerializers.err,
    },
  },
  stream,
)
