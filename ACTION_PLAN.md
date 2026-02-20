# TourneyDo - Action Plan & Implementation Guide

**Created:** February 20, 2026

---

## Quick Start: Top 10 Priority Actions

### 🚨 Week 1: Critical Security & Stability

1. **Remove Debug Endpoints**
   ```bash
   # Delete these files:
   - app/api/check-stats/route.ts
   - app/api/debug-participants/route.ts
   - app/api/import-test/route.ts
   - app/api/sentry-example-api/route.ts
   - scripts/debug-*.ts (keep for development, document in .gitignore)
   ```

2. **Implement Global Error Boundary**
   ```typescript
   // app/global-error.tsx
   'use client'
   
   import { useEffect } from 'react'
   import { Button } from '@/components/ui/button'
   
   export default function GlobalError({
     error,
     reset,
   }: {
     error: Error & { digest?: string }
     reset: () => void
   }) {
     useEffect(() => {
       // Log to error reporting service
       console.error(error)
     }, [error])
   
     return (
       <html>
         <body>
           <div className="flex flex-col items-center justify-center min-h-screen gap-4">
             <h2>Something went wrong!</h2>
             <Button onClick={() => reset()}>Try again</Button>
           </div>
         </body>
       </html>
     )
   }
   ```

3. **Add Request Validation Middleware**
   ```typescript
   // lib/middleware/validation.ts
   import { ZodSchema } from 'zod'
   import { NextRequest, NextResponse } from 'next/server'
   
   export async function validateRequest(
     req: NextRequest,
     schema: ZodSchema
   ) {
     try {
       const data = await req.json()
       const validated = schema.parse(data)
       return { valid: true, data: validated }
     } catch (error) {
       return {
         valid: false,
         error: 'Invalid request data',
         response: NextResponse.json(
           { error: 'Invalid request data' },
           { status: 400 }
         ),
       }
     }
   }
   ```

4. **Enable Sentry for Client & Server**
   ```typescript
   // sentry.client.config.ts
   import * as Sentry from "@sentry/nextjs"
   
   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     integrations: [
       new Sentry.Replay({
         maskAllText: true,
         blockAllMedia: true,
       }),
     ],
     tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
     replaysSessionSampleRate: 0.1,
     replaysOnErrorSampleRate: 1.0,
     enabled: process.env.NODE_ENV === 'production',
   })
   ```

5. **Create API Error Response Standard**
   ```typescript
   // lib/api/response.ts
   import { NextResponse } from 'next/server'
   
   export interface ApiError {
     code: string
     message: string
     details?: Record<string, string>
     requestId?: string
   }
   
   export function errorResponse(
     code: string,
     message: string,
     status: number = 400,
     details?: Record<string, string>
   ) {
     return NextResponse.json(
       {
         code,
         message,
         details,
       } as ApiError,
       { status }
     )
   }
   
   export function successResponse<T>(data: T, status: number = 200) {
     return NextResponse.json(data, { status })
   }
   ```

### 📚 Week 1: Documentation Foundation

6. **Create Comprehensive README**
   ```markdown
   # TourneyDo - Tournament Management Platform
   
   ## Getting Started
   
   ### Prerequisites
   - Node.js 18+
   - npm/yarn
   - Supabase account
   - Clerk account
   
   ### Setup
   
   1. Clone repository
   ```bash
   git clone ...
   cd startup-boilerplate
   ```
   
   2. Install dependencies
   ```bash
   npm install
   ```
   
   3. Environment variables
   ```bash
   cp .env.example .env.local
   # Edit with your values
   ```
   
   ### Environment Variables
   - `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase key
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk key
   - `CLERK_SECRET_KEY` - Clerk secret
   - `NEXT_PUBLIC_SENTRY_DSN` - Sentry DSN
   
   ### Running Locally
   ```bash
   npm run dev
   # Open http://localhost:3000
   ```
   
   ### Building
   ```bash
   npm run build
   npm start
   ```
   
   ### Testing
   ```bash
   npm test                  # Unit tests
   npm run test:watch      # Watch mode
   npm run test:coverage   # Coverage report
   ```
   
   ### E2E Testing
   ```bash
   npm run dev
   # In another terminal:
   npx playwright test
   ```
   ```

7. **Document Database Schema**
   ```markdown
   # Database Schema Documentation
   
   ## Tables Overview
   
   ### users
   - User accounts with roles
   - Managed by Clerk auth
   - RLS policies for data isolation
   
   ### teams
   - Teams created by coaches
   - Belongs to a user
   - Can have multiple players
   
   ### players
   - Individual athletes
   - Has physical attributes (weight, height, belt)
   - Belongs to a coach
   
   ### tournaments
   - Events organized by tournament organizers
   - Contains divisions and matches
   - Can have registrations
   
   ### matches
   - Individual bouts in tournament
   - Tracks scores and winner
   - Has lifecycle states
   ```

8. **Create API Documentation Template**
   ```markdown
   # API Documentation
   
   ## Authentication
   All requests require Clerk JWT token in Authorization header:
   ```
   Authorization: Bearer <token>
   ```
   
   ## Endpoints
   
   ### Tournaments
   
   #### GET /api/tournaments
   List tournaments
   - Query: status, limit, offset
   - Response: { data: Tournament[], total: number }
   
   #### POST /api/tournaments
   Create tournament
   - Body: { name, start_date, end_date }
   - Response: Tournament
   
   #### GET /api/tournaments/:id
   Get tournament details
   - Response: Tournament
   ```

9. **Create Development Guidelines**
   ```markdown
   # Development Guidelines
   
   ## Code Organization
   
   - `/lib/actions/` - Server actions for mutations
   - `/lib/db/` - Database queries
   - `/components/` - React components
   - `/lib/validations/` - Zod schemas
   
   ## Naming Conventions
   
   - Components: PascalCase
   - Files: kebab-case
   - Functions: camelCase
   - Constants: UPPER_SNAKE_CASE
   
   ## Type Safety
   
   - Always use TypeScript
   - Never use `any` type
   - Validate inputs with Zod
   - Use domain types from `/types/models.ts`
   
   ## Error Handling
   
   - Use ActionResult<T> for server actions
   - Wrap API routes with try-catch
   - Log errors to Sentry
   - Return user-friendly messages
   ```

10. **Create Security Checklist**
    ```markdown
    # Security Checklist
    
    ## Before Deployment
    
    - [ ] No debug endpoints in production
    - [ ] All API routes validate input
    - [ ] All mutations check authorization
    - [ ] Sensitive data not logged
    - [ ] CORS properly configured
    - [ ] Rate limiting enabled
    - [ ] SQL injection prevented (Supabase)
    - [ ] XSS protection in place
    - [ ] CSRF tokens validated
    - [ ] Dependencies scanned for vulnerabilities
    
    ## On Production
    
    - [ ] Enable request logging
    - [ ] Monitor error rates
    - [ ] Setup alerting
    - [ ] Regular security audits
    - [ ] Dependency updates tracked
    ```

---

## Implementation Details: Next 30 Days

### Week 2: Testing Foundation

#### Create Unit Test Examples
```typescript
// lib/utils/__tests__/errors.test.ts
import { handleSupabaseError, createActionError } from '@/lib/utils/errors'

describe('Error Handling', () => {
  describe('handleSupabaseError', () => {
    it('should return unique constraint violation message', () => {
      const error = { code: '23505', message: 'Duplicate key' }
      const result = handleSupabaseError(error)
      expect(result).toBe('This record already exists')
    })

    it('should return permission denied message', () => {
      const error = { code: '42501', message: 'Permission denied' }
      const result = handleSupabaseError(error)
      expect(result).toBe('You do not have permission to perform this action')
    })
  })

  describe('createActionError', () => {
    it('should create error result', () => {
      const result = createActionError('Test error')
      expect(result.success).toBe(false)
      expect(result.error).toBe('Test error')
    })
  })
})
```

#### Add Component Tests
```typescript
// components/__tests__/button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick handler when clicked', async () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>Click</Button>)
    
    await userEvent.click(screen.getByText('Click'))
    expect(onClick).toHaveBeenCalled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### Week 3: Observability & Monitoring

#### Setup Structured Logging
```typescript
// lib/logger.ts
import pino from 'pino'

const isDev = process.env.NODE_ENV === 'development'

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      }
    : undefined,
  formatters: {
    bindings: () => ({}),
    level: (label) => ({ level: label }),
  },
})

// Usage in server actions:
logger.info({ action: 'tournament_created', tournamentId }, 'Tournament created')
logger.error({ error: err }, 'Failed to create tournament')
```

#### Add Event Tracking
```typescript
// lib/events/tracker.ts
export enum EventType {
  TOURNAMENT_CREATED = 'tournament_created',
  REGISTRATION_SUBMITTED = 'registration_submitted',
  PAYMENT_APPROVED = 'payment_approved',
  MATCH_COMPLETED = 'match_completed',
}

export async function trackEvent(
  type: EventType,
  userId: string,
  metadata: Record<string, any>
) {
  // Log locally
  logger.info({ event: type, userId, metadata })
  
  // Send to Sentry for analytics
  import * as Sentry from '@sentry/nextjs'
  Sentry.captureEvent({
    message: type,
    contexts: { metadata },
    level: 'info',
  })
}
```

### Week 4: Feature Improvements

#### Add Analytics Dashboard
```typescript
// lib/analytics/queries.ts
export async function getTournamentStats(tournamentId: string) {
  const supabase = createClerkSupabaseClient()
  
  const stats = await Promise.all([
    // Total participants
    supabase
      .from('tournament_registrations')
      .select('*', { count: 'exact' })
      .eq('tournament_id', tournamentId),
    
    // Completed matches
    supabase
      .from('matches')
      .select('*', { count: 'exact' })
      .eq('tournament_id', tournamentId)
      .eq('status', 'completed'),
    
    // Average wait time
    supabase.rpc('get_average_match_wait_time', { p_tournament_id: tournamentId }),
  ])
  
  return {
    totalParticipants: stats[0].count,
    completedMatches: stats[1].count,
    avgWaitTime: stats[2].data,
  }
}
```

#### Implement Import/Export
```typescript
// lib/actions/tournament-export.ts
export async function exportTournamentData(tournamentId: string) {
  const supabase = createClerkSupabaseClient()
  
  const [tournament, participants, matches] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', tournamentId).single(),
    supabase.from('tournament_registrations').select('*').eq('tournament_id', tournamentId),
    supabase.from('matches').select('*').eq('tournament_id', tournamentId),
  ])
  
  const csv = generateCSV({
    tournament: tournament.data,
    participants: participants.data,
    matches: matches.data,
  })
  
  return csv
}

function generateCSV(data: any) {
  // Implementation...
}
```

---

## CI/CD Setup (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Run lint
        run: npm run lint
      
      - name: Run type check
        run: npx tsc --noEmit
      
      - name: Run unit tests
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      
      - run: npx playwright install
      
      - name: Run E2E tests
        run: npx playwright test
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL_TEST }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_KEY_TEST }}
```

---

## Pre-Launch Verification Checklist

### Security
- [ ] Remove all debug endpoints
- [ ] Audit all API routes for authorization
- [ ] Verify RLS policies on all sensitive tables
- [ ] Test SQL injection prevention
- [ ] Verify CORS headers
- [ ] Test rate limiting
- [ ] Scan dependencies: `npm audit`

### Performance
- [ ] Lighthouse score >90 on landing page
- [ ] Core Web Vitals optimized
- [ ] Database queries indexed properly
- [ ] Images optimized
- [ ] No console errors in production build

### Quality
- [ ] All tests passing
- [ ] Coverage >70%
- [ ] No TypeScript errors
- [ ] ESLint passes
- [ ] Code reviewed

### Documentation
- [ ] README complete
- [ ] API documented
- [ ] Database schema documented
- [ ] Setup instructions clear
- [ ] Deployment guide written

### Observability
- [ ] Sentry configured
- [ ] Logging enabled
- [ ] Monitoring dashboard setup
- [ ] Alerts configured
- [ ] Runbooks written

---

## Post-Launch Roadmap (First Quarter)

### Month 1: Stabilization
- Monitor error rates and performance
- Fix any bugs found by users
- Improve error messages based on feedback
- Setup automated backups

### Month 2: Analytics
- Add tournament analytics dashboard
- Implement user analytics
- Create admin reporting
- Add business metrics tracking

### Month 3: Advanced Features
- Implement bulk import/export
- Add email notification system
- Create API for third-party integrations
- Build spectator mobile view

---

## Key Performance Indicators (KPIs)

Track these metrics post-launch:
- **Error Rate**: <0.1% (target)
- **API Response Time**: <200ms p95
- **Database Query Time**: <100ms p95
- **Page Load Time**: <2s
- **Test Coverage**: >80%
- **Mean Time To Recovery (MTTR)**: <30 mins

---

## References & Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Clerk Docs](https://clerk.com/docs)
- [Zod Validation](https://zod.dev)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/security)
- [Clerk Security](https://clerk.com/docs/security)

### Testing
- [Jest Docs](https://jestjs.io)
- [Testing Library](https://testing-library.com)
- [Playwright Docs](https://playwright.dev)

### Deployment
- [Vercel Docs](https://vercel.com/docs)
- [GitHub Actions](https://github.com/features/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

