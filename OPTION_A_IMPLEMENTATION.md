# Option A: Critical Fixes - Pre-Implementation Plan

**Status: READY TO BUILD**  
**Scope: Remove Debug Endpoints + Standardize Error Handling + Write Tests**  
**Timeline: Week 1 of ACTION_PLAN.md**

---

## 1️⃣ Requirements Clarity - COMPLETE ✅

### What are we building?

**Phase 1: Remove Debug Endpoints (Production Security)**
- Remove `/api/check-stats/route.ts` - Exposes sensitive tournament data
- Remove `/api/debug-participants/route.ts` - Debug endpoint with no auth
- Remove `/api/import-test/route.ts` - CSV test importer (374 lines, uses hardcoded tour ID)
- Remove routes from `proxy.ts` public route matcher
- Verify no references remain in codebase
- **Why:** Debug endpoints are security vulnerabilities in production

**Phase 2: Standardize Error Handling (Code Quality)**
- Standardize `/api/participants/add/route.ts` - Inconsistent error handling
- Standardize `/api/participants/update/route.ts` - Missing validation wrapper
- Create error handler utilities if not existing
- Ensure all API routes follow CLAUDE.md patterns
- **Why:** Inconsistent error handling leads to bugs and security issues

**Phase 3: Write Unit Tests (Test Coverage)**
- Write tests for remaining `/api/participants/*` routes
- Write tests for server actions that lack coverage
- Aim for >70% coverage on critical paths
- Focus on happy path + 3+ error scenarios per feature
- **Why:** <10% coverage is unacceptable for production

---

### Acceptance Criteria

✅ **Phase 1 Complete When:**
- [ ] All 3 debug endpoint files deleted
- [ ] `proxy.ts` updated to remove public routes for deleted endpoints
- [ ] Grep search for deleted endpoints returns 0 results
- [ ] No build warnings about deleted routes
- [ ] Local testing shows routes 404

✅ **Phase 2 Complete When:**
- [ ] `/api/participants/add/route.ts` follows CLAUDE.md error pattern
- [ ] `/api/participants/update/route.ts` follows CLAUDE.md error pattern
- [ ] All error responses are structured (code, message, details)
- [ ] Input validation uses Zod schemas
- [ ] Error messages are user-friendly
- [ ] Sensitive errors logged but not exposed to client

✅ **Phase 3 Complete When:**
- [ ] Test coverage >70% overall
- [ ] All API routes have ≥1 happy path test
- [ ] All routes have ≥2 error case tests
- [ ] All validation points have tests
- [ ] `npm test` passes 100%
- [ ] No test warnings

### Success Metrics

**How do we know this is done?**
1. Build succeeds: `npm run build` ✅
2. Tests pass: `npm test` (>70% coverage) ✅
3. Lint passes: `npm run lint` ✅
4. Type check passes: `npx tsc --noEmit` ✅
5. Debug endpoints gone: No routes in `/api/check-stats`, `/api/debug-*`, `/api/import-test` ✅
6. Error handling standardized: All API routes follow template ✅
7. Tests comprehensive: >70% coverage on api routes ✅

---

## 2️⃣ Edge Cases & Failure Scenarios - COMPLETE ✅

### Phase 1: Endpoint Deletion Edge Cases

| Scenario | How to Handle |
|----------|---------------|
| Debug endpoint still referenced in code | Grep search finds all references |
| Proxy.ts has hardcoded public route | Remove from `createRouteMatcher` array |
| Tests reference deleted endpoint | Delete associated test files |
| Database still has test data | Keep - it's fine to have test records |
| Frontend still calls deleted endpoint | Search frontend for fetch calls |

**Deletion Checklist:**
```bash
# Before deletion
grep -r "check-stats" --include="*.ts" --include="*.tsx"
grep -r "debug-participants" --include="*.ts" --include="*.tsx"
grep -r "import-test" --include="*.ts" --include="*.tsx"

# After deletion
npm run build  # Must succeed
npm run lint   # No errors
```

### Phase 2: Error Handling Edge Cases

| Scenario | Current State | Fix Required |
|----------|---------------|--------------|
| **Missing auth** | Returns 401 | ✅ Both routes handle this |
| **Invalid JSON** | Crashes? | ❌ Need try-catch wrapper |
| **Missing required fields** | Returns 400 | ✅ Both routes check |
| **Team not found** | Returns 404 | ✅ Both routes check |
| **Duplicate registration** | Throws error? | ❌ Need graceful handling |
| **Database error** | Generic 500? | ❌ Need Sentry tracking |
| **Validation error** | Returns 400 | ⚠️ Need consistent format |
| **Rate limit** | Not implemented | ⚠️ Consider ArcJet |

**Error Response Format (Standardized):**
```typescript
{
  success: false,
  error: {
    code: "INVALID_INPUT",      // Machine-readable
    message: "Email is required", // User-friendly
    details: {                    // Optional field-level errors
      email: "Email is required"
    }
  }
}
```

### Phase 3: Testing Edge Cases

| Feature | Happy Path | Error Case 1 | Error Case 2 | Error Case 3 |
|---------|-----------|--------------|--------------|--------------|
| **POST /api/participants/add** | Valid data → 201 | No auth → 401 | Invalid data → 400 | Team not found → 404 |
| **POST /api/participants/update** | Valid data → 200 | No auth → 401 | Invalid data → 400 | Participant not found → 404 |
| **GET /api/participants/add** (if exists) | Valid query → 200 | Invalid format → 400 | Not found → 404 | Server error → 500 |

---

## 3️⃣ Security Review - COMPLETE ✅

### Phase 1: Debug Endpoints (CRITICAL SECURITY ISSUE)

❌ **CURRENT PROBLEM:**
```typescript
// app/api/check-stats/route.ts
// NO AUTHENTICATION - Anyone can call this
export async function GET() {
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, entry_fee')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  // EXPOSES: tournament revenue, registration count
  return Response.json({
    projectedRevenue: (count || 0) * (tournament.entry_fee || 0)
  })
}
```

**Impact:** Public exposure of business metrics (revenue estimates)

✅ **SOLUTION:** Delete endpoints entirely

---

### Phase 2: Participants API Routes

**Authentication Required?** ✅ YES
```typescript
const { userId } = await auth()
if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
```

**Authorization Required?** ⚠️ PARTIAL (needs verification)
- Current: Checks if team exists
- Missing: Verify user is the coach/organizer of team
```typescript
// MISSING: Authorization check
if (team.user_id !== userId) {
  return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
}
```

**Input Validation?** ⚠️ PARTIAL
- Current: Manual checks for required fields
- Needed: Zod schema validation
```typescript
// Create Zod schema
export const addParticipantSchema = z.object({
  tournamentId: z.string().uuid(),
  player_id: z.string().uuid().optional(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional(),
  dob: z.coerce.date().optional(),
  gender: z.enum(['male', 'female', 'other']),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  belt_level: z.string(),
  team_id: z.string().uuid(),
})
```

**Data Protection?** ⚠️ NEEDS WORK
- PII involved: First name, last name, email, DOB
- Action: Add to audit logging (track who modified what)
- Masking: Don't expose user IDs in error messages

**Security Checklist for Phase 2:**
- [ ] Add authorization check (verify team ownership)
- [ ] Create Zod validation schema
- [ ] Add Sentry error tracking
- [ ] Log all mutations with userId + resource ID
- [ ] Never expose database errors to client
- [ ] Add rate limiting (10 requests/minute per user)

---

## 4️⃣ Type Safety & TypeScript - COMPLETE ✅

### Input Types

**Phase 1: Debug Endpoints**
- No inputs needed (deleting)

**Phase 2: Participants Routes**

```typescript
// lib/validations/participants.ts

import { z } from 'zod'

export const addParticipantSchema = z.object({
  tournamentId: z.string().uuid('Invalid tournament ID'),
  player_id: z.string().uuid().optional(),
  first_name: z.string().min(1, 'First name required').max(100),
  last_name: z.string().min(1, 'Last name required').max(100),
  email: z.string().email('Invalid email').optional(),
  dob: z.coerce.date().optional(),
  gender: z.enum(['male', 'female', 'other']),
  weight: z.number().positive('Weight must be positive').optional(),
  height: z.number().positive('Height must be positive').optional(),
  belt_level: z.string().min(1, 'Belt level required'),
  team_id: z.string().uuid('Invalid team ID'),
})

export type AddParticipantInput = z.infer<typeof addParticipantSchema>

export const updateParticipantSchema = z.object({
  registrationId: z.string().uuid('Invalid registration ID'),
  status: z.enum(['pending', 'verified', 'checked_in', 'completed', 'eliminated']),
  actual_weight: z.number().positive().optional(),
  actual_height: z.number().positive().optional(),
  belt_level: z.string().optional(),
})

export type UpdateParticipantInput = z.infer<typeof updateParticipantSchema>
```

### Output Types

```typescript
// Already defined in types/models.ts - verify exists
interface Participant {
  id: string
  tournament_id: string
  player_id: string
  team_id: string
  status: 'pending' | 'verified' | 'checked_in' | 'completed' | 'eliminated'
  actual_weight?: number
  actual_height?: number
  created_at: string
  updated_at: string
}

// API Response Type
type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: Record<string, string> } }
```

### Error Types

```typescript
// lib/utils/error-handler.ts

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, string>
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Usage
if (!team.user_id === userId) {
  throw new ApiError('FORBIDDEN', 'Not authorized to manage this team', 403)
}
```

---

## 5️⃣ Error Handling Strategy - COMPLETE ✅

### Error Response Template (Standardized)

All errors return this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly message",
    "details": { "field": "field-specific error" },
    "requestId": "req-uuid-for-debugging"
  }
}
```

### Error Paths to Handle

**Phase 2: Participants Routes**

| Scenario | Code | Status | Message | Details |
|----------|------|--------|---------|---------|
| Missing auth | UNAUTHORIZED | 401 | "Must be logged in" | None |
| Not team owner | FORBIDDEN | 403 | "Not authorized for this team" | None |
| Invalid JSON | INVALID_INPUT | 400 | "Invalid request body" | None |
| Missing field | VALIDATION_ERROR | 400 | "Validation failed" | `{email: "Required"}` |
| Team not found | NOT_FOUND | 404 | "Team not found" | None |
| Player not found | NOT_FOUND | 404 | "Player not found" | None |
| Duplicate registration | CONFLICT | 409 | "Player already registered" | None |
| Database error | INTERNAL_ERROR | 500 | "Internal server error" | None (log actual error) |
| Rate limited | TOO_MANY_REQUESTS | 429 | "Too many requests" | `{retryAfter: "60"}` |

### Logging Strategy

```typescript
// ALL errors logged with context
import { logger } from '@/lib/utils/logger'
import * as Sentry from '@sentry/nextjs'

try {
  // ... operation
} catch (error) {
  // Log locally with context
  logger.error({
    error: error instanceof Error ? error.message : 'Unknown error',
    userId,
    teamId,
    action: 'add_participant',
  }, 'Failed to add participant')
  
  // Send to Sentry for monitoring
  Sentry.captureException(error, {
    tags: { userId, action: 'add_participant' }
  })
  
  // Return structured error to client
  return ApiResponse.error(ApiError.INTERNAL_ERROR, 'Something went wrong')
}
```

### Error Recovery

- **Client-side:** Toast notification shows error message
- **Server-side:** All errors logged + tracked in Sentry
- **User can retry:** All POST requests are safe to retry
- **Idempotency:** Consider idempotency keys for duplicate protection

---

## 6️⃣ Testing Strategy - COMPLETE ✅

### Phase 1: Debug Endpoints
- No tests needed (deleting code)
- Delete any test files if they exist

### Phase 2 & 3: Participants Routes

```typescript
// __tests__/api/participants-add.test.ts

import { POST } from '@/app/api/participants/add/route'
import { auth } from '@clerk/nextjs/server'
import { getTeamById } from '@/lib/db/queries/teams'
import { createPlayer } from '@/lib/db/queries/players'
import { NextRequest } from 'next/server'

jest.mock('@clerk/nextjs/server')
jest.mock('@/lib/db/queries/teams')
jest.mock('@/lib/db/queries/players')

describe('POST /api/participants/add', () => {
  // ✅ Happy Path Test
  it('should create participant with valid input', async () => {
    ;(auth as jest.Mock).mockResolvedValue({ userId: 'user-123' })
    ;(getTeamById as jest.Mock).mockResolvedValue({
      id: 'team-123',
      user_id: 'user-123',
    })
    ;(createPlayer as jest.Mock).mockResolvedValue({ id: 'player-123' })

    const request = new NextRequest('http://localhost/api/participants/add', {
      method: 'POST',
      body: JSON.stringify({
        tournamentId: 'tour-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        dob: '2000-01-01',
        gender: 'male',
        belt_level: 'blue',
        team_id: 'team-123',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.success).toBe(true)
  })

  // ✅ Error Case 1: No Auth
  it('should return 401 if not authenticated', async () => {
    ;(auth as jest.Mock).mockResolvedValue({ userId: null })

    const request = new NextRequest('http://localhost/api/participants/add', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error.code).toBe('UNAUTHORIZED')
  })

  // ✅ Error Case 2: Invalid Input
  it('should return 400 with missing required field', async () => {
    ;(auth as jest.Mock).mockResolvedValue({ userId: 'user-123' })

    const request = new NextRequest('http://localhost/api/participants/add', {
      method: 'POST',
      body: JSON.stringify({
        tournamentId: 'tour-123',
        // Missing first_name
        last_name: 'Doe',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  // ✅ Error Case 3: Unauthorized (not team owner)
  it('should return 403 if not team owner', async () => {
    ;(auth as jest.Mock).mockResolvedValue({ userId: 'user-123' })
    ;(getTeamById as jest.Mock).mockResolvedValue({
      id: 'team-123',
      user_id: 'user-456', // Different user!
    })

    const request = new NextRequest('http://localhost/api/participants/add', {
      method: 'POST',
      body: JSON.stringify({
        tournamentId: 'tour-123',
        first_name: 'John',
        last_name: 'Doe',
        gender: 'male',
        belt_level: 'blue',
        team_id: 'team-123',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error.code).toBe('FORBIDDEN')
  })

  // ✅ Error Case 4: Resource Not Found
  it('should return 404 if team not found', async () => {
    ;(auth as jest.Mock).mockResolvedValue({ userId: 'user-123' })
    ;(getTeamById as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/participants/add', {
      method: 'POST',
      body: JSON.stringify({
        tournamentId: 'tour-123',
        first_name: 'John',
        last_name: 'Doe',
        gender: 'male',
        belt_level: 'blue',
        team_id: 'team-123',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error.code).toBe('NOT_FOUND')
  })
})
```

### Test Coverage Goal

| Path | Target | Type |
|------|--------|------|
| Happy path | 100% | Happy path test |
| Auth errors | 100% | Error test |
| Validation errors | 100% | Validation test |
| Authorization errors | 100% | Authorization test |
| Not found errors | 100% | Error test |
| Database errors | 100% | Mocked error test |
| **Overall** | **>70%** | CI/CD requirement |

---

## 7️⃣ Performance & Scalability - COMPLETE ✅

### Phase 1: Debug Endpoints
- **Deleting** - No performance impact except removal of overhead
- Current `/api/check-stats` runs 2 database queries (moderate cost)
- Current `/api/debug-participants` fetches up to 10,000 records (expensive)

### Phase 2: Participants Routes

**Current Queries:**
```typescript
// app/api/participants/add/route.ts - Line ~45
const team = await getTeamById(team_id)
// Uses: SELECT * FROM teams WHERE id = ? AND user_id = ?
// Index: Should have index on (id, user_id)
// Cost: ~1-2ms
```

**Optimization Needed?**
- ✅ Add index on `teams(id, user_id)`
- ✅ Add index on `tournament_registrations(tournament_id, player_id)`

**Response Time Targets:**
- API latency: <200ms p95
- Database query: <50ms
- Validation: <10ms

**Scale Assumptions:**
- Concurrent users: ~100
- Tournament size: ~500 participants
- Query result: <100 records

**Caching Strategy:**
- Don't cache user auth (always verify)
- Don't cache team data (may change during tournament)
- Consider caching tournament metadata (rarely changes)

---

## 8️⃣ Documentation Plan - COMPLETE ✅

### Phase 1: Endpoint Deletion
- Add comment to git commit: "Remove debug endpoints - security vulnerability"
- No API docs needed (removing endpoints)

### Phase 2: Participants API Routes

**File Header Comments:**
```typescript
/**
 * Participant Registration API Routes
 * 
 * Handles:
 * - Adding players to tournaments
 * - Updating participant status
 * - Validating player information
 * 
 * Security: All endpoints require authentication
 * Authorization: User must own the team
 * Validation: Zod schemas for all inputs
 */
```

**API Documentation:**
```markdown
## POST /api/participants/add

Add a player to a tournament

### Authentication
Required: Clerk JWT token

### Authorization
User must be the team owner

### Request Body
{
  "tournamentId": "uuid",
  "team_id": "uuid",
  "player_id": "uuid" (optional),
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "dob": "ISO 8601 date",
  "gender": "male|female|other",
  "belt_level": "string",
  "weight": "number (kg)",
  "height": "number (cm)"
}

### Response: 201 Created
{
  "success": true,
  "data": {
    "id": "uuid",
    "player_id": "uuid",
    "status": "verified",
    "created_at": "ISO 8601"
  }
}

### Error Responses

**400 Bad Request** - Validation error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": { "email": "Invalid email format" }
  }
}
```

**401 Unauthorized** - Not authenticated
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Must be logged in"
  }
}
```

**403 Forbidden** - Not team owner
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Not authorized to manage this team"
  }
}
```

**404 Not Found** - Resource not found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Team not found"
  }
}
```

**409 Conflict** - Player already registered
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Player already registered for this tournament"
  }
}
```

**500 Internal Server Error** - Server error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Internal server error"
  }
}
```

### Examples

**Add new player:**
```bash
curl -X POST http://localhost:3000/api/participants/add \
  -H "Authorization: Bearer <clerk-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "123e4567-e89b-12d3-a456-426614174000",
    "team_id": "123e4567-e89b-12d3-a456-426614174001",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "dob": "2000-01-01",
    "gender": "male",
    "belt_level": "blue"
  }'
```

**Add existing player:**
```bash
curl -X POST http://localhost:3000/api/participants/add \
  -H "Authorization: Bearer <clerk-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "123e4567-e89b-12d3-a456-426614174000",
    "team_id": "123e4567-e89b-12d3-a456-426614174001",
    "player_id": "123e4567-e89b-12d3-a456-426614174002"
  }'
```
```

---

## ✅ Final Sign-Off - READY TO BUILD

### All 8 Sections Complete?
- [x] 1. Requirements Clear
- [x] 2. Edge Cases Identified
- [x] 3. Security Reviewed
- [x] 4. Types Defined
- [x] 5. Error Handling Planned
- [x] 6. Testing Strategy Clear
- [x] 7. Performance Considered
- [x] 8. Documentation Planned

### Outstanding Questions
None - all sections have actionable details

### Blockers
None - ready to implement

### Sign-Off
✅ All sections complete  
✅ No outstanding questions  
✅ No blockers  
✅ Ready to start building  
✅ Code will follow CLAUDE.md standards  

---

## 🚀 Implementation Order

1. **Create utility files** (error handler, logger setup)
2. **Create Zod schema** (`lib/validations/participants.ts`)
3. **Create tests** (`__tests__/api/participants-*.test.ts`)
4. **Update `/api/participants/add/route.ts`** with error handling + auth check
5. **Update `/api/participants/update/route.ts`** with error handling + auth check
6. **Delete debug endpoints:**
   - `app/api/check-stats/route.ts`
   - `app/api/debug-participants/route.ts`
   - `app/api/import-test/route.ts`
7. **Update `proxy.ts`** - remove public routes
8. **Verify build:**
   ```bash
   npm run lint      # Must pass
   npm test          # Must pass, >70% coverage
   npx tsc --noEmit  # No errors
   npm run build     # Must succeed
   ```

---

## 📚 Reference Files

- Architecture: `/Users/gian/Desktop/startup-boilerplate/CODEBASE_ANALYSIS.md`
- Code examples: `/Users/gian/Desktop/startup-boilerplate/QUICK_FIXES.md`
- Best practices: `/Users/gian/Desktop/startup-boilerplate/CLAUDE.md`
- Feature status: `/Users/gian/Desktop/startup-boilerplate/FEATURES_MATRIX.md`

---

**Build it right. Test it thoroughly. Ship it confidently.** 🎯
