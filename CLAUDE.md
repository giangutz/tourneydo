# CLAUDE.md - AI Agent Guidelines for TourneyDo

**Comprehensive guide for Claude agents building TourneyDo to ensure production-ready code**

Last Updated: February 20, 2026

---

## 🎯 Mission Statement

Build **production-grade tournament management software** by following these standards. Every line of code must be:
- **Secure** - No vulnerabilities or data exposure
- **Tested** - Unit tests included with features
- **Documented** - Clear explanations for complex logic
- **Performant** - Optimized for scale
- **Maintainable** - Future developers can understand it

---

## 📋 Pre-Implementation Checklist

Before writing ANY code, verify:

- [ ] **Requirements Clear** - User story has acceptance criteria
- [ ] **Edge Cases Identified** - What could go wrong?
- [ ] **Security Reviewed** - Any auth/validation needed?
- [ ] **Type Safety** - Full TypeScript types defined
- [ ] **Error Handling** - All failure paths covered
- [ ] **Testing Strategy** - How will this be tested?
- [ ] **Performance Impact** - Will this scale?
- [ ] **Documentation Plan** - How will this be explained?

**If any box is unchecked, ASK FOR CLARIFICATION before proceeding.**

---

## 🏗️ Architecture Standards

### Layer Structure (Must Follow)

```
Request Entry Point
    ↓
Authentication Layer (via Clerk)
    ↓
Authorization Layer (RLS + Code checks)
    ↓
Input Validation (Zod schemas)
    ↓
Server Action / API Route
    ↓
Business Logic Layer
    ↓
Database Query Layer
    ↓
Error Handling
    ↓
Response
```

### File Organization (Must Follow)

**Server Actions** → `/lib/actions/`
```typescript
// lib/actions/tournament-create.ts
// - Handle mutations
// - Called from client components
// - Use revalidatePath() for cache
// - Return ActionResult<T>
```

**Database Queries** → `/lib/db/queries/`
```typescript
// lib/db/queries/tournament-queries.ts
// - Read-only operations
// - No mutations
// - No side effects
```

**Business Logic** → `/lib/application/`
```typescript
// lib/application/use-cases/
// - Complex business rules
// - Tournament scheduling
// - Bracket generation
// - Payment processing
```

**Components** → `/components/`
```typescript
// components/tournaments/tournament-form.tsx
// - UI only
// - No business logic
// - Use server actions for mutations
```

**Types & Validation** → `/lib/validations/` and `/types/`
```typescript
// lib/validations/tournament.ts
// - Zod schemas
// - Input validation
// - Type derivation
```

---

## 🔒 Security Requirements

### Every API Route MUST:

```typescript
// ✅ REQUIRED PATTERN
export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATE
    const { userId } = await auth()
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401)
    }

    // 2. VALIDATE INPUT
    const validation = await validateRequestBody(request, createTournamentSchema)
    if (!validation.valid) return validation.error
    const data = validation.data

    // 3. AUTHORIZE (user owns resource)
    const canAccess = await checkUserAccess(userId, data.tournamentId)
    if (!canAccess) {
      return errorResponse('FORBIDDEN', 'Not authorized to access', 403)
    }

    // 4. EXECUTE BUSINESS LOGIC
    const result = await processTournament(data)

    // 5. LOG SUCCESS
    logger.info({ userId, tournamentId: result.id }, 'Tournament created')

    return successResponse(result, 200)
  } catch (error) {
    logger.error({ error }, 'API error')
    Sentry.captureException(error)
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
```

### Every Server Action MUST:

```typescript
// ✅ REQUIRED PATTERN
'use server'

export async function updateTournament(
  tournamentId: string,
  input: UpdateTournamentInput
): Promise<ActionResult<Tournament>> {
  try {
    // 1. AUTHENTICATE
    const { userId } = await auth()
    if (!userId) return createActionError('Unauthorized', 'UNAUTHORIZED')

    // 2. VALIDATE
    const validated = updateTournamentSchema.parse(input)

    // 3. AUTHORIZE
    const tournament = await db.tournaments.findById(tournamentId)
    if (!tournament || tournament.organizer_id !== userId) {
      return createActionError('Not authorized', 'FORBIDDEN')
    }

    // 4. EXECUTE
    const updated = await db.tournaments.update(tournamentId, validated)

    // 5. TRACK & REVALIDATE
    await trackEvent(EventType.TOURNAMENT_UPDATED, {
      userId,
      tournamentId,
    })
    revalidatePath('/dashboard/tournaments')

    return createActionSuccess(updated)
  } catch (error) {
    logger.error({ error }, 'Update tournament failed')
    return createActionError('Failed to update', 'INTERNAL_ERROR')
  }
}
```

### Never Write These Patterns ❌

```typescript
// ❌ NO: Unvalidated API routes
export async function POST(request: Request) {
  const data = await request.json()
  await db.update(data)
}

// ❌ NO: Missing auth checks
export async function GET() {
  return Response.json(await db.getAllUsers())
}

// ❌ NO: Catching errors silently
try {
  await operation()
} catch (e) {
  // Oops, error disappeared
}

// ❌ NO: User IDs in URLs without validation
async function getUser(userId: string) {
  return db.users.find(userId) // Could be other user!
}

// ❌ NO: Direct string interpolation in queries
query(`SELECT * FROM users WHERE id = '${userId}'`) // SQL injection!

// ❌ NO: Exposing internal errors to clients
catch (error) {
  return Response.json(error.message)
}
```

---

## ✅ Code Quality Standards

### Type Safety: Always Use TypeScript

```typescript
// ✅ GOOD: Explicit types everywhere
interface TournamentInput {
  name: string
  startDate: Date
  organizerId: string
}

function createTournament(input: TournamentInput): Promise<Tournament> {
  // ...
}

// ❌ NEVER: Using 'any'
function createTournament(input: any): any {
  // ...
}

// ❌ NEVER: Missing types
function createTournament(input) {
  // ...
}
```

### Validation: Always Use Zod

```typescript
// ✅ GOOD: Zod schema with clear constraints
export const createTournamentSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  startDate: z.coerce.date()
    .min(new Date(), 'Tournament must be in the future'),
  endDate: z.coerce.date(),
  organizerId: z.string().uuid('Invalid organizer ID'),
}).refine(
  (data) => data.endDate >= data.startDate,
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
)

// ❌ NEVER: Manual validation
function createTournament(input: any) {
  if (!input.name) throw new Error('Name required')
  if (input.name.length < 2) throw new Error('Too short')
}
```

### Error Handling: Be Explicit

```typescript
// ✅ GOOD: Structured error responses
interface ApiError {
  code: string
  message: string
  details?: Record<string, string>
  requestId?: string
}

// ✅ GOOD: Specific error types
type ActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string; code: string }

// ✅ GOOD: Catch and handle errors meaningfully
try {
  const result = await operation()
  return createActionSuccess(result)
} catch (error) {
  if (error instanceof NotFoundError) {
    return createActionError('Resource not found', 'NOT_FOUND')
  }
  if (error instanceof ValidationError) {
    return createActionError('Invalid input', 'VALIDATION_ERROR')
  }
  logger.error({ error }, 'Unexpected error')
  return createActionError('Internal server error', 'INTERNAL_ERROR')
}

// ❌ NEVER: Swallow errors
try {
  await operation()
} catch (e) {
  // Silently ignore
}

// ❌ NEVER: Generic errors
throw new Error('Something went wrong')
```

### Logging: Always Be Structured

```typescript
// ✅ GOOD: Structured logging with context
logger.info(
  { userId: '123', action: 'tournament_created', tournamentId: 'abc' },
  'Tournament created successfully'
)

logger.error(
  { error: err, userId: '123', action: 'payment_failed' },
  'Payment processing failed'
)

// ❌ NEVER: Console.log in production code
console.log('User created:', user)

// ❌ NEVER: String concatenation in logs
logger.info('User ' + userId + ' created tournament ' + tournamentId)

// ❌ NEVER: Sensitive data in logs
logger.info({ creditCard: user.creditCard }, 'Payment info')
```

---

## 🧪 Testing Requirements

### Every Feature MUST Have Tests

```typescript
// lib/actions/__tests__/tournament-create.test.ts

import { createTournament } from '@/lib/actions/tournament-create'
import { auth } from '@clerk/nextjs/server'
import { createClerkSupabaseClient } from '@/lib/supabase/client'

jest.mock('@clerk/nextjs/server')
jest.mock('@/lib/supabase/client')

describe('createTournament', () => {
  // ✅ Test the happy path
  it('should create tournament with valid input', async () => {
    ;(auth as jest.Mock).mockResolvedValue({ userId: 'user-123' })
    
    const result = await createTournament({
      name: 'Spring Championship',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-02'),
    })

    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Spring Championship')
  })

  // ✅ Test error cases
  it('should return error if not authenticated', async () => {
    ;(auth as jest.Mock).mockResolvedValue({ userId: null })
    
    const result = await createTournament({
      name: 'Test',
      startDate: new Date(),
      endDate: new Date(),
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Unauthorized')
  })

  // ✅ Test validation
  it('should reject invalid input', async () => {
    ;(auth as jest.Mock).mockResolvedValue({ userId: 'user-123' })
    
    const result = await createTournament({
      name: 'X', // Too short
      startDate: new Date(),
      endDate: new Date(),
    })

    expect(result.success).toBe(false)
  })

  // ✅ Test edge cases
  it('should reject end date before start date', async () => {
    const result = await createTournament({
      name: 'Test',
      startDate: new Date('2026-03-02'),
      endDate: new Date('2026-03-01'), // Before start!
    })

    expect(result.success).toBe(false)
  })
})
```

### Minimum Test Coverage: 70%

```bash
# Run tests with coverage
npm run test:coverage

# Coverage should show:
# ✅ Lines: >70%
# ✅ Functions: >70%
# ✅ Branches: >70%
# ✅ Statements: >70%
```

### Test Types Required

| Type | Location | When |
|------|----------|------|
| **Unit Tests** | `__tests__/` | Always - test functions in isolation |
| **Component Tests** | `__tests__/` | For UI components |
| **Integration Tests** | `__tests__/` | For feature workflows |
| **E2E Tests** | `e2e/` | For critical user paths |
| **API Tests** | `__tests__/` | For API routes |

---

## 📚 Documentation Requirements

### Every File MUST Have Header Comments

```typescript
/**
 * Tournament creation and management server actions
 * 
 * This module handles:
 * - Creating new tournaments
 * - Updating tournament details
 * - Publishing tournaments to public
 * 
 * Security: All actions verify user is tournament organizer
 */
```

### Complex Functions MUST Have JSDoc

```typescript
/**
 * Generate bracket structure for tournament participants
 * 
 * Algorithm: Single elimination with automatic advancement
 * - Takes all registered participants
 * - Groups by division
 * - Generates matches with balanced seeding
 * - Returns bracket structure and first round matches
 * 
 * @param tournamentId - ID of tournament
 * @param divisions - Array of divisions to process
 * @returns Bracket structure with all matches
 * @throws ValidationError if participants < 2
 * 
 * Performance: O(n log n) where n = number of participants
 * 
 * Example:
 * ```
 * const bracket = await generateBracket('tour-123', ['adult', 'youth'])
 * console.log(bracket.totalMatches) // 15
 * ```
 */
export async function generateBracket(
  tournamentId: string,
  divisions: string[]
): Promise<BracketStructure> {
  // ...
}
```

### All Components MUST Have PropTypes or Types

```typescript
// ✅ GOOD: Full typing
interface TournamentFormProps {
  initialData?: Tournament
  onSubmit: (data: CreateTournamentInput) => Promise<void>
  isLoading?: boolean
}

export function TournamentForm({
  initialData,
  onSubmit,
  isLoading = false,
}: TournamentFormProps) {
  // ...
}

// ❌ NEVER: Missing prop types
export function TournamentForm(props: any) {
  // ...
}
```

### Public APIs MUST Be Documented

```typescript
/**
 * API: POST /api/tournaments
 * 
 * Create a new tournament
 * 
 * Authentication: Required (Clerk JWT)
 * Authorization: User must be tournament organizer
 * Rate Limit: 10 per minute
 * 
 * Request Body:
 * {
 *   "name": "Spring Championship",
 *   "description": "Outdoor tournament",
 *   "startDate": "2026-03-01T00:00:00Z",
 *   "endDate": "2026-03-02T00:00:00Z",
 *   "location": "Central Park",
 *   "courts": 4
 * }
 * 
 * Response: 201 Created
 * {
 *   "id": "tour-abc123",
 *   "name": "Spring Championship",
 *   "createdAt": "2026-02-20T14:36:00Z",
 *   "status": "upcoming"
 * }
 * 
 * Errors:
 * - 400: Invalid input (missing fields, bad dates)
 * - 401: Not authenticated
 * - 403: Not authorized (not organizer)
 * - 409: Tournament name already exists
 * - 429: Rate limit exceeded
 * - 500: Internal server error
 * 
 * Examples:
 * curl -X POST http://localhost:3000/api/tournaments \
 *   -H "Authorization: Bearer <token>" \
 *   -H "Content-Type: application/json" \
 *   -d '{"name":"Test","startDate":"2026-03-01"}'
 */
```

---

## 🚀 Performance Standards

### Database Queries

```typescript
// ✅ GOOD: Efficient query with indexes
const tournament = await supabase
  .from('tournaments')
  .select('*')
  .eq('id', tournamentId)
  .eq('organizer_id', userId)  // Uses indexed column
  .single()

// ✅ GOOD: Count-only queries when needed
const { count } = await supabase
  .from('matches')
  .select('*', { count: 'exact', head: true })
  .eq('tournament_id', tournamentId)

// ❌ SLOW: N+1 queries
const tournaments = await db.tournaments.find({ userId })
for (const tournament of tournaments) {
  tournament.participants = await db.participants.count(tournament.id)
}

// ❌ SLOW: Selecting unused columns
const user = await db.users.select('*').find(userId)
// Maybe you only needed: id, email, name

// ❌ SLOW: No pagination on large results
const allMatches = await db.matches.find({ tournamentId })
```

### Frontend Performance

```typescript
// ✅ GOOD: Code splitting with dynamic imports
const TournamentBracket = dynamic(
  () => import('@/components/tournament-bracket'),
  { loading: () => <Skeleton /> }
)

// ✅ GOOD: Memoization for expensive renders
const MemoizedMatchCard = memo(({ match }: MatchProps) => {
  return <div>{match.name}</div>
})

// ✅ GOOD: Pagination on large lists
const [page, setPage] = useState(1)
const tournaments = await getTournaments({ page, limit: 20 })

// ❌ SLOW: Rendering huge lists at once
{tournaments.map(t => <TournamentCard key={t.id} tournament={t} />)}
// If 10,000 tournaments, browser crashes!

// ❌ SLOW: Heavy computations in render
tournaments.sort((a, b) => complexCalculation(a) - complexCalculation(b))
```

### Caching Strategy

```typescript
// ✅ GOOD: Cache frequently accessed data
const getCachedTournament = cache(async (id: string) => {
  return supabase.from('tournaments').select('*').eq('id', id).single()
})

// ✅ GOOD: Revalidate on mutations
'use server'
export async function updateTournament(data: UpdateData) {
  const result = await db.tournaments.update(data)
  revalidatePath('/dashboard/tournaments')
  return result
}

// ❌ NEVER: Cache without invalidation
const tournamentCache = {}
async function getTournament(id: string) {
  if (tournamentCache[id]) return tournamentCache[id]
  const t = await db.tournaments.find(id)
  tournamentCache[id] = t
  return t
  // What if tournament is updated elsewhere? Cache is stale!
}
```

---

## 🔄 Git & Deployment Workflow

### Before Committing Code

```bash
# 1. Run tests
npm test

# 2. Check coverage
npm run test:coverage
# Must be >70%

# 3. Lint code
npm run lint

# 4. Type check
npx tsc --noEmit

# 5. Build
npm run build
# Must succeed with no errors

# Only commit if all checks pass!
```

### Commit Message Format

```
feat(tournaments): implement bracket generation

- Added generateBracket() server action
- Supports single-elimination format
- Includes comprehensive error handling
- Added unit tests (coverage: 95%)

Fixes #123

Security: Validates user is tournament organizer
Performance: O(n log n) algorithm, <1s for 256 participants
Testing: 8 test cases covering happy path and errors
Documentation: Added JSDoc and API docs
```

### Code Review Checklist

Before merging ANY pull request, verify:

- [ ] **Tests pass** - No failing tests
- [ ] **Coverage maintained** - >70%
- [ ] **No security issues** - Auth/validation checked
- [ ] **Error handling** - All paths covered
- [ ] **Type safe** - No `any` types
- [ ] **Documented** - Comments, JSDoc, API docs
- [ ] **Lint passes** - No linting errors
- [ ] **Build succeeds** - No build errors
- [ ] **No debug code** - No console.log or TODOs
- [ ] **Performance** - No obvious slowdowns

---

## 📊 Monitoring & Observability

### Every Action MUST Track Events

```typescript
'use server'
export async function registerTeam(teamId: string): Promise<ActionResult<void>> {
  try {
    const { userId } = await auth()
    
    // Track business event
    await trackEvent(EventType.TOURNAMENT_REGISTRATION_SUBMITTED, {
      userId,
      teamId,
    })

    // Do work...
    
    // Track success
    logger.info({ userId, teamId }, 'Team registered')
    
    return createActionSuccess(undefined)
  } catch (error) {
    // Track failure
    logger.error({ error, userId, teamId }, 'Registration failed')
    await trackEvent(EventType.TOURNAMENT_REGISTRATION_FAILED, {
      userId,
      teamId,
      error: error instanceof Error ? error.message : 'Unknown',
    })
    
    return createActionError('Failed to register', 'INTERNAL_ERROR')
  }
}
```

### Enable Sentry for All Errors

```typescript
// Every error gets tracked
import * as Sentry from '@sentry/nextjs'

try {
  // ...
} catch (error) {
  Sentry.captureException(error)
  // Also log locally
  logger.error({ error }, 'Critical error')
}
```

### Monitor Key Operations

```typescript
// Track performance of expensive operations
const start = performance.now()
const result = await expensiveOperation()
const duration = performance.now() - start

if (duration > 1000) {
  logger.warn({ duration }, 'Slow operation detected')
}
```

---

## 🎯 Definition of Done Checklist

A feature is ONLY complete when:

### Code Quality
- [ ] Written in TypeScript with strict mode
- [ ] No `any` types
- [ ] Proper error handling (try/catch, validation)
- [ ] No console.log statements
- [ ] Follows code style (Prettier formatted)
- [ ] ESLint passes with no warnings

### Security
- [ ] Authentication verified (user logged in)
- [ ] Authorization verified (user owns resource)
- [ ] Input validated with Zod
- [ ] SQL injection impossible (using Supabase)
- [ ] XSS prevented (React escaping)
- [ ] CSRF protected (server actions)
- [ ] No sensitive data exposed
- [ ] Sentry configured for errors

### Testing
- [ ] Unit tests written (happy path + errors)
- [ ] Component tests if UI
- [ ] Edge cases covered
- [ ] Test coverage >70%
- [ ] All tests passing
- [ ] Mocks used appropriately

### Documentation
- [ ] File header comment added
- [ ] Complex functions documented with JSDoc
- [ ] API endpoints documented (if applicable)
- [ ] TypeScript types documented
- [ ] Examples provided
- [ ] Edge cases explained

### Performance
- [ ] Database queries optimized
- [ ] No N+1 queries
- [ ] Pagination for large results
- [ ] Caching considered
- [ ] Load tested if critical path
- [ ] No obvious inefficiencies

### Observability
- [ ] Key actions logged
- [ ] Business events tracked
- [ ] Errors sent to Sentry
- [ ] Performance metrics monitored
- [ ] User actions visible in logs

### Deployment Ready
- [ ] Code review approved
- [ ] All CI checks passing
- [ ] Builds successfully
- [ ] No warnings
- [ ] Runnable locally
- [ ] Database migrations ready

---

## 🆘 When in Doubt

### Decision Matrix

| Situation | Action |
|-----------|--------|
| **Unsure about architecture** | Ask in #architecture or review CODEBASE_ANALYSIS.md |
| **Unsure about type design** | Look at similar features in codebase |
| **Unsure about security** | Be paranoid - verify auth AND authorization |
| **Unsure about error handling** | Handle explicitly - don't swallow errors |
| **Unsure about testing** | Test happy path + 3 error cases minimum |
| **Unsure about performance** | Run N+1 query check - use `npm run analyze` |
| **Unsure about documentation** | Document for future you - assume they're tired |

### Red Flags - STOP & ASK BEFORE PROCEEDING

🚫 **Stop and ask if you see:**
- No tests for a feature
- `any` type used
- `try/catch` without handling error
- `console.log` in production code
- Direct user ID in URL without validation
- Unencrypted sensitive data
- Missing error messages
- Hardcoded values (env vars instead)
- No TypeScript types defined
- Security check missing
- Performance implications unclear
- No documentation

---

## 📞 Escalation Path

If you encounter:

1. **Uncertainty about requirements** → Ask for clarity before coding
2. **Architectural decision** → Reference CODEBASE_ANALYSIS.md or ask for guidance
3. **Security concern** → Be paranoid, implement defense-in-depth
4. **Performance question** → Measure before optimizing
5. **Build/deployment issue** → Check ACTION_PLAN.md or CI/CD docs
6. **Unknown error pattern** → Log it, track it, document it

---

## 🎓 Learning Resources

- **Architecture:** `CODEBASE_ANALYSIS.md` (Section 1)
- **Implementation:** `ACTION_PLAN.md` (Week 1-4)
- **Code Examples:** `QUICK_FIXES.md` (Copy-paste templates)
- **Features:** `FEATURES_MATRIX.md` (What's needed)
- **Decisions:** `README_ANALYSIS.md` (Overview)

---

## ✨ Production Code Traits

The code you write should be:

✅ **Secure** - Authentication, authorization, validation always  
✅ **Tested** - Unit tests, happy path + errors  
✅ **Typed** - Full TypeScript, no `any`  
✅ **Documented** - Code comments, JSDoc, examples  
✅ **Performant** - Queries optimized, no N+1  
✅ **Maintainable** - Clear structure, easy to understand  
✅ **Observable** - Logged, tracked, monitored  
✅ **Reliable** - Error handling, edge cases covered  

---

## 🚀 Final Reminder

**Every commit should be deployment-ready.**

If you wouldn't be comfortable shipping this code to production RIGHT NOW, it's not done.

---

**Remember:** Future you (or your teammates) will thank you for:
- ✅ Clear code
- ✅ Comprehensive tests
- ✅ Good documentation
- ✅ Security by default
- ✅ Error handling
- ✅ Logging & monitoring

**Build it right the first time.** 🎯

