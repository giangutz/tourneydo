# TourneyDo - Quick Fixes & Code Snippets

**For rapid implementation of recommended improvements**

---

## 1. API Route Template (Remove Debug Endpoints)

### Delete These Files:
```bash
# Remove these debug/test endpoints from production
app/api/check-stats/route.ts
app/api/debug-participants/route.ts
app/api/import-test/route.ts
app/api/sentry-example-api/route.ts
app/api/verify-import/route.ts
```

### Add This Template for New API Routes:
```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { exampleSchema } from '@/lib/validations/example'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse and validate request
    const body = await request.json()
    const validatedData = exampleSchema.parse(body)

    // 3. Log request
    logger.info(
      { userId, action: 'example_action' },
      'Processing example action'
    )

    // 4. Process request
    const result = await doSomething(validatedData)

    // 5. Log success
    logger.info(
      { userId, resultId: result.id },
      'Example action completed'
    )

    return NextResponse.json(result)
  } catch (error) {
    // 6. Error handling
    logger.error({ error }, 'Failed to process example action')
    Sentry.captureException(error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.flatten() },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## 2. Global Error Handler

### Create File: `app/global-error.tsx`
```typescript
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to Sentry
    Sentry.captureException(error)
    
    // Log locally in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Global error:', error)
    }
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">Oops!</h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-md">
              Something went wrong. We've been notified and are working on fixing it.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-8 p-4 bg-red-50 rounded-lg text-left max-w-lg">
                <summary className="cursor-pointer font-semibold">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-4 text-sm overflow-auto">
                  {error.message}
                  {error.stack}
                </pre>
              </details>
            )}
          </div>

          <div className="flex gap-4">
            <Button size="lg" onClick={() => reset()}>
              Try Again
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </div>

          {error.digest && (
            <p className="text-sm text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
```

---

## 3. Logger Setup

### Create File: `lib/logger.ts`
```typescript
import pino from 'pino'

const isDev = process.env.NODE_ENV === 'development'
const isProduction = process.env.NODE_ENV === 'production'

// Create logger with appropriate transport
export const logger = pino(
  {
    level: isDev ? 'debug' : 'info',
    // Only use pretty printing in development
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  }
)

/**
 * Structured logging helper for server actions and API routes
 */
export function logAction(
  action: string,
  status: 'success' | 'error' | 'info',
  metadata?: Record<string, any>
) {
  if (status === 'error') {
    logger.error({ action, ...metadata }, `Action failed: ${action}`)
  } else if (status === 'success') {
    logger.info({ action, ...metadata }, `Action completed: ${action}`)
  } else {
    logger.info({ action, ...metadata }, `Action: ${action}`)
  }
}

/**
 * Log database queries in development
 */
export function logQuery(query: string, duration: number) {
  if (isDev) {
    logger.debug({ query, duration }, 'Database query')
  }
}

/**
 * Log performance metrics
 */
export function logPerformance(
  operation: string,
  duration: number,
  threshold: number = 1000
) {
  const level = duration > threshold ? 'warn' : 'debug'
  logger[level](
    { operation, duration },
    `Performance: ${operation} took ${duration}ms`
  )
}
```

---

## 4. Event Tracking System

### Create File: `lib/events/tracker.ts`
```typescript
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

export enum EventType {
  // Tournament events
  TOURNAMENT_CREATED = 'tournament_created',
  TOURNAMENT_UPDATED = 'tournament_updated',
  TOURNAMENT_DELETED = 'tournament_deleted',
  TOURNAMENT_STARTED = 'tournament_started',
  TOURNAMENT_COMPLETED = 'tournament_completed',

  // Registration events
  REGISTRATION_SUBMITTED = 'registration_submitted',
  REGISTRATION_APPROVED = 'registration_approved',
  REGISTRATION_REJECTED = 'registration_rejected',

  // Match events
  MATCH_STARTED = 'match_started',
  MATCH_COMPLETED = 'match_completed',
  MATCH_SCORE_UPDATED = 'match_score_updated',

  // Payment events
  PAYMENT_SUBMITTED = 'payment_submitted',
  PAYMENT_APPROVED = 'payment_approved',
  PAYMENT_REJECTED = 'payment_rejected',

  // User events
  USER_REGISTERED = 'user_registered',
  USER_LOGGED_IN = 'user_logged_in',
  USER_LOGGED_OUT = 'user_logged_out',
}

interface EventMetadata {
  userId?: string
  tournamentId?: string
  entityId?: string
  [key: string]: any
}

/**
 * Track business events for analytics and monitoring
 */
export async function trackEvent(
  eventType: EventType,
  metadata: EventMetadata,
  context?: { timestamp?: Date }
) {
  const timestamp = context?.timestamp || new Date()

  // 1. Log locally
  logger.info(
    {
      event: eventType,
      ...metadata,
      timestamp: timestamp.toISOString(),
    },
    `Event: ${eventType}`
  )

  // 2. Send to Sentry for analytics
  Sentry.captureEvent({
    message: eventType,
    level: 'info',
    timestamp: timestamp.getTime() / 1000,
    contexts: {
      event: {
        type: eventType,
        ...metadata,
      },
    },
    tags: {
      event_type: eventType,
      user_id: metadata.userId,
    },
  })

  // 3. Send to custom analytics endpoint (optional)
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    try {
      await fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          metadata,
          timestamp: timestamp.toISOString(),
        }),
      }).catch((err) => {
        // Don't throw - analytics failure shouldn't break app
        logger.error({ error: err }, 'Failed to send analytics event')
      })
    } catch (error) {
      logger.error({ error }, 'Analytics event failed')
    }
  }
}

/**
 * High-value event wrapper for critical business logic
 */
export async function trackCriticalEvent(
  eventType: EventType,
  metadata: EventMetadata,
  operation: () => Promise<void>
) {
  try {
    await trackEvent(eventType, { ...metadata, status: 'started' })
    await operation()
    await trackEvent(eventType, { ...metadata, status: 'completed' })
  } catch (error) {
    await trackEvent(eventType, {
      ...metadata,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
```

---

## 5. Standardized Action Result Type

### Update File: `types/api.ts`
```typescript
/**
 * Standard response type for all server actions
 * Enables consistent error handling across the application
 */
export type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code?: string; details?: Record<string, string> }

/**
 * Helper to create successful result
 */
export function createActionSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

/**
 * Helper to create error result
 */
export function createActionError(
  message: string,
  code?: string,
  details?: Record<string, string>
): ActionResult<never> {
  return { success: false, error: message, code, details }
}

/**
 * Type guard to check if result is successful
 */
export function isActionSuccess<T>(
  result: ActionResult<T>
): result is { success: true; data: T } {
  return result.success === true
}

/**
 * Type guard to check if result is error
 */
export function isActionError<T>(
  result: ActionResult<T>
): result is { success: false; error: string } {
  return result.success === false
}
```

---

## 6. Enhanced Server Action Template

### Create File: `lib/actions/template.ts`
```typescript
'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { createClerkSupabaseClient } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { trackEvent, EventType } from '@/lib/events/tracker'
import type { ActionResult } from '@/types/api'
import { createActionSuccess, createActionError } from '@/types/api'

/**
 * Server action template with all best practices
 */
export async function exampleAction(
  input: { id: string }
): Promise<ActionResult<{ success: boolean }>> {
  try {
    // 1. Authenticate
    const { userId } = await auth()
    if (!userId) {
      logger.warn({ input }, 'Unauthorized access attempt')
      return createActionError('Unauthorized', 'UNAUTHORIZED')
    }

    // 2. Validate input (already done by caller, but double-check)
    if (!input.id) {
      return createActionError('Missing required field: id', 'VALIDATION_ERROR')
    }

    // 3. Create authenticated Supabase client
    const supabase = await createClerkSupabaseClient()

    // 4. Check authorization (user owns resource)
    const { data: resource, error: fetchError } = await supabase
      .from('resources')
      .select('user_id')
      .eq('id', input.id)
      .single()

    if (fetchError || !resource) {
      logger.warn({ userId, resourceId: input.id }, 'Resource not found')
      return createActionError('Resource not found', 'NOT_FOUND')
    }

    if (resource.user_id !== userId) {
      logger.warn(
        { userId, resourceId: input.id, ownerId: resource.user_id },
        'Unauthorized resource access'
      )
      return createActionError('Not authorized to access this resource', 'FORBIDDEN')
    }

    // 5. Track event start
    logger.info({ userId, resourceId: input.id }, 'Starting action')

    // 6. Perform action
    const { data, error } = await supabase
      .from('resources')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', input.id)

    if (error) {
      throw error
    }

    // 7. Track success
    await trackEvent(EventType.TOURNAMENT_UPDATED, {
      userId,
      entityId: input.id,
    })

    logger.info({ userId, resourceId: input.id }, 'Action completed successfully')

    // 8. Revalidate cache
    revalidatePath('/dashboard')

    return createActionSuccess({ success: true })
  } catch (error) {
    // 9. Log error
    logger.error(
      { error, input },
      error instanceof Error ? error.message : 'Unknown error'
    )

    // 10. Track failure
    await trackEvent(EventType.TOURNAMENT_UPDATED, {
      entityId: input.id,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return createActionError(
      'Failed to process action',
      'INTERNAL_ERROR'
    )
  }
}
```

---

## 7. Database Query Performance Logger

### Create File: `lib/db/performance.ts`
```typescript
import { logger, logPerformance } from '@/lib/logger'

/**
 * Wrap Supabase queries to log performance
 */
export async function loggedQuery<T>(
  label: string,
  query: () => Promise<T>,
  threshold: number = 1000
): Promise<T> {
  const start = performance.now()
  
  try {
    const result = await query()
    const duration = performance.now() - start
    
    logPerformance(label, duration, threshold)
    
    return result
  } catch (error) {
    const duration = performance.now() - start
    logger.error(
      { label, duration, error },
      `Query failed: ${label}`
    )
    throw error
  }
}

/**
 * Example usage in database queries
 */
export async function getTournament(tournamentId: string) {
  return loggedQuery(
    `getTournament(${tournamentId})`,
    async () => {
      const supabase = await createClerkSupabaseClient()
      const { data } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single()
      return data
    },
    500 // Alert if query takes longer than 500ms
  )
}
```

---

## 8. Input Validation Middleware

### Create File: `lib/middleware/validate.ts`
```typescript
import { ZodSchema, ZodError } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Middleware for validating request body
 */
export async function validateRequestBody<T extends ZodSchema>(
  request: NextRequest,
  schema: T
): Promise<{ valid: true; data: any } | { valid: false; error: NextResponse }> {
  try {
    const body = await request.json()
    const validated = schema.parse(body)
    return { valid: true, data: validated }
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.flatten() }, 'Validation failed')
      return {
        valid: false,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.flatten().fieldErrors,
          },
          { status: 400 }
        ),
      }
    }

    logger.error({ error }, 'Failed to parse request body')
    return {
      valid: false,
      error: NextResponse.json(
        { error: 'Invalid request format', code: 'PARSE_ERROR' },
        { status: 400 }
      ),
    }
  }
}

/**
 * Usage in API route:
 * 
 * const validation = await validateRequestBody(request, createTournamentSchema)
 * if (!validation.valid) {
 *   return validation.error
 * }
 * const data = validation.data
 */
```

---

## 9. Rate Limiting Setup

### Create File: `lib/rate-limit.ts`
```typescript
import Arcjet, { tokenBucket } from '@arcjet/next'

const aj = Arcjet({
  key: process.env.ARCJET_KEY,
  characteristics: ['ip.src'],
  rules: [
    // General rate limit: 100 requests per 60 seconds
    tokenBucket({
      mode: 'LIVE',
      refillRate: 100,
      interval: 60,
    }),
  ],
})

/**
 * Rate limit middleware for API routes
 */
export async function rateLimit(request: Request) {
  const decision = await aj.protect(request)

  if (decision.isDenied()) {
    return {
      rateLimited: true,
      response: new Response('Too many requests', { status: 429 }),
    }
  }

  return { rateLimited: false }
}

/**
 * Specific rate limit for expensive operations
 */
export const strictRateLimit = Arcjet({
  key: process.env.ARCJET_KEY,
  characteristics: ['ip.src'],
  rules: [
    // 10 requests per minute for expensive operations
    tokenBucket({
      mode: 'LIVE',
      refillRate: 10,
      interval: 60,
    }),
  ],
})
```

---

## 10. Environment Variables Template

### Create File: `.env.example`
```bash
# ============================================================================
# Database Configuration
# ============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# ============================================================================
# Authentication
# ============================================================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-publishable-key
CLERK_SECRET_KEY=your-secret-key

# ============================================================================
# Monitoring & Error Tracking
# ============================================================================
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-auth-token

# ============================================================================
# Email Service
# ============================================================================
RESEND_API_KEY=your-resend-key

# ============================================================================
# Security
# ============================================================================
ARCJET_KEY=your-arcjet-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ============================================================================
# Analytics (Optional)
# ============================================================================
NEXT_PUBLIC_ANALYTICS_ENDPOINT=https://your-analytics-endpoint.com

# ============================================================================
# Environment
# ============================================================================
NODE_ENV=development
```

---

## Implementation Checklist

Use this to track implementation of fixes:

```markdown
## Quick Fixes (Week 1)
- [ ] Delete debug endpoints (check-stats, debug-*, etc.)
- [ ] Create global-error.tsx
- [ ] Add logger.ts
- [ ] Create event tracker system
- [ ] Update types/api.ts with ActionResult
- [ ] Create .env.example

## Testing (Week 2)
- [ ] Add basic error handling tests
- [ ] Add validation schema tests
- [ ] Add component tests for critical components
- [ ] Verify 70% coverage threshold works

## Documentation (Week 2)
- [ ] Update README
- [ ] Add API documentation
- [ ] Document environment variables
- [ ] Create development guidelines

## Observability (Week 3)
- [ ] Setup structured logging
- [ ] Enable Sentry on client
- [ ] Add performance monitoring
- [ ] Create event tracking
- [ ] Setup monitoring dashboard

## Advanced (Week 4+)
- [ ] Implement rate limiting
- [ ] Add caching layer
- [ ] Create analytics dashboard
- [ ] Setup CI/CD pipeline
```

