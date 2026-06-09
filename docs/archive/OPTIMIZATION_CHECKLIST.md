# Connection Optimization - Implementation Checklist

**Start Date:** _____________  
**Target Completion:** 1-2 days  
**Current Capacity:** 50-80 concurrent users  
**Target Capacity:** 150+ concurrent users  

---

## Phase 1: Critical Path (Day 1 - ~65 minutes)

### ✅ Pre-Implementation

- [ ] Read `OPTIMIZATION_QUICK_START.md` (15 min)
- [ ] Review `DATABASE_CONNECTION_OPTIMIZATION.md` summary
- [ ] Backup current code: `git commit -m "backup: before optimization"`
- [ ] Current load test baseline: `npm run test:performance:load` → Save results as `before.txt`
- [ ] Check current connections: `psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"`

### ✅ Step 1: Enable PgBouncer (5 minutes)

**Objective:** Enable connection pooling to reduce overhead by 40%

- [ ] Open Supabase Dashboard
- [ ] Navigate to Project Settings → Database
- [ ] Find "Connection String" section
- [ ] Switch "Connection Mode" from "Direct" to **"Pooling"**
- [ ] Copy new connection string (ends with `:6543`)
- [ ] Update `.env.local`:
  ```bash
  DATABASE_URL_POOLED=postgresql://...host:6543/dbname?pgbouncer=true
  ```
- [ ] Test connection: `psql $DATABASE_URL_POOLED -c "SELECT 1;"`
- [ ] Verify no errors in local dev: `npm run dev`

**Verification:**
- [ ] Local app still runs without errors
- [ ] No "connection refused" errors
- [ ] API routes respond normally

### ✅ Step 2: Consolidate Realtime Subscriptions (30 minutes)

**Objective:** Reduce 3 subscriptions per user to 1 subscription (66% reduction)

#### Step 2a: Review Optimized Version
- [ ] Open `/hooks/use-tournament-realtime.optimized.ts`
- [ ] Compare with `/hooks/use-tournament-realtime.ts`
- [ ] Understand the changes:
  - Removed registration subscription
  - Removed tournament subscription
  - Increased debounce to 1500ms
  - Added comments explaining why

#### Step 2b: Update Hook
- [ ] Backup: `cp hooks/use-tournament-realtime.ts hooks/use-tournament-realtime.ts.backup`
- [ ] Choose one:
  - **Option A (Safe):** Manually apply changes from optimized version
  - **Option B (Fast):** `cp hooks/use-tournament-realtime.optimized.ts hooks/use-tournament-realtime.ts`
- [ ] Verify file syntax: `npx tsc --noEmit hooks/use-tournament-realtime.ts`

#### Step 2c: Test Functionality
- [ ] Start app: `npm run dev`
- [ ] Go to tournament bracket page
- [ ] Make a match update
- [ ] Verify update appears within 2 seconds
- [ ] Open browser console, verify `[Tournament Realtime] Connected` message
- [ ] Check that ONLY matches subscription is active (1 subscription)

#### Step 2d: Test with Multiple Tabs
- [ ] Open bracket in 2 browser tabs
- [ ] Make update in tab 1
- [ ] Verify appears in tab 2 within 2 seconds
- [ ] Verify no console errors
- [ ] Check connection count: `psql $DATABASE_URL_POOLED -c "SELECT count(*) FROM pg_stat_activity;"`

**Verification:**
- [ ] Bracket updates appear within 2 seconds
- [ ] No "subscription failed" errors
- [ ] Connections reduced by ~30-40%
- [ ] No console errors in DevTools

### ✅ Step 3: Aggressive Background Cleanup (20 minutes)

**Objective:** Disconnect hidden tabs within 5 seconds (30-40% idle reduction)

#### Step 3a: Review Optimized Version
- [ ] Open `/lib/realtime/subscriptions.optimized.ts`
- [ ] Find these constants:
  ```typescript
  const INACTIVITY_TIMEOUT = 10 * 1000       // Was 30s
  const PAGE_HIDDEN_TIMEOUT = 5 * 1000       // New: 5s for hidden tabs
  ```

#### Step 3b: Update Subscription Manager
- [ ] Backup: `cp lib/realtime/subscriptions.ts lib/realtime/subscriptions.ts.backup`
- [ ] Choose one:
  - **Option A (Safe):** Manually update timeouts and cleanup logic
  - **Option B (Fast):** `cp lib/realtime/subscriptions.optimized.ts lib/realtime/subscriptions.ts`
- [ ] Verify syntax: `npx tsc --noEmit lib/realtime/subscriptions.ts`

#### Step 3c: Test Aggressive Cleanup
- [ ] Start app: `npm run dev`
- [ ] Go to bracket page
- [ ] Open browser console
- [ ] Hide the tab (switch to different window/tab)
- [ ] Watch console for `[SubscriptionManager] Status: DISCONNECTED_HIDDEN`
- [ ] Should appear within 5 seconds
- [ ] Click back to tab
- [ ] Watch console for `[SubscriptionManager] Status: CONNECTED`
- [ ] Connection should re-establish within 1 second

#### Step 3d: Test Inactivity Cleanup
- [ ] Go to bracket page
- [ ] Let page sit idle (no mouse movement, no clicks)
- [ ] Watch console for `[SubscriptionManager] User inactive, disconnecting...`
- [ ] Should appear after 10 seconds of inactivity
- [ ] Move mouse or click
- [ ] Should reconnect immediately

**Verification:**
- [ ] Hidden tabs disconnect within 5 seconds
- [ ] Reconnection smooth (no errors)
- [ ] Idle cleanup happens after 10 seconds
- [ ] No connection stuck in "disconnected" state

### ✅ Step 4: Increase Debounce Intervals (10 minutes)

**Objective:** Batch updates better (allow 3+ updates per refresh cycle)

- [ ] Open `hooks/use-tournament-realtime.ts`
- [ ] Find:
  ```typescript
  const debouncedRefresh = useDebouncedCallback(
    () => router.refresh(),
    500,      // ← Change this line
    { maxWait: 2000 }
  )
  ```
- [ ] Replace with:
  ```typescript
  const debouncedRefresh = useDebouncedCallback(
    () => router.refresh(),
    1500,     // ← Changed from 500
    { maxWait: 5000 }  // ← Changed from 2000
  )
  ```
- [ ] Verify syntax: `npx tsc --noEmit hooks/use-tournament-realtime.ts`

#### Test Updated Debounce
- [ ] Start app: `npm run dev`
- [ ] Go to bracket page
- [ ] Make 3 quick score updates
- [ ] Verify page refreshes only 1-2 times (not 3 times)
- [ ] Verify all updates appear in final UI
- [ ] No delays in displaying updates

**Verification:**
- [ ] Updates batch together
- [ ] Fewer page refreshes
- [ ] No missing updates
- [ ] UI feels responsive

### ✅ Step 5: Load Test & Measure (30 minutes)

**Objective:** Verify 3x capacity improvement

#### Before Load Test
- [ ] Kill all running instances: `Ctrl+C` in dev terminal
- [ ] Fresh start: `npm run dev` in new terminal
- [ ] Let app warm up (30 seconds)

#### Run Load Test
```bash
npm run test:performance:load
```

#### Record Results
- [ ] Save output: `npm run test:performance:load 2>&1 | tee after.txt`
- [ ] Open `before.txt` and `after.txt`
- [ ] Compare:
  ```bash
  diff before.txt after.txt
  ```

#### Key Metrics to Compare
- [ ] HTTP Requests: Should be same or higher
- [ ] HTTP Errors: Should remain <1%
- [ ] Duration p(95): Target <500ms
- [ ] Duration p(99): Target <1000ms
- [ ] Connections used: Should be 30-40% lower

**Verification:**
```
Expected Phase 1 Results:
✓ Error rate: <1%
✓ p95 latency: <500ms
✓ p99 latency: <1000ms
✓ Connections at 50 users: 50→150 (was 150-200)
✓ Concurrent capacity: ~150 users
```

### ✅ Post-Phase 1 Cleanup

- [ ] Commit changes: `git commit -m "optimization: phase 1 - consolidate subscriptions and aggressive cleanup"`
- [ ] Delete backup files:
  ```bash
  rm hooks/use-tournament-realtime.ts.backup
  rm lib/realtime/subscriptions.ts.backup
  ```
- [ ] Document results:
  - [ ] Create `OPTIMIZATION_RESULTS.md` (or update if exists)
  - [ ] Note capacity before/after
  - [ ] Note connection reduction
  - [ ] Note response time improvements

---

## Phase 2: Short-term Optimizations (Optional - Days 2-3)

### ✅ Step 6: Result Caching (2-3 hours)

**Objective:** Cache tournament data to reduce queries by 60-70%

#### Step 6a: Caching Library Ready
- [ ] Verify file exists: `/lib/cache/result-cache.ts`
- [ ] Review the API:
  ```typescript
  resultCache.get(key, fetchFn, ttl)
  resultCache.invalidate(key)
  resultCache.invalidatePattern(pattern)
  ```

#### Step 6b: Add to Tournament Queries
- [ ] Find file: `lib/db/queries/tournaments.ts` (or similar)
- [ ] At top, add:
  ```typescript
  import { resultCache } from '@/lib/cache/result-cache'
  ```
- [ ] Wrap getTournamentById:
  ```typescript
  // Before:
  const tournament = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  // After:
  const tournament = await resultCache.get(
    `tournament:${id}`,
    async () => {
      const result = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single()
      if (result.error) throw new Error(result.error.message)
      return result.data
    },
    5 * 60 * 1000  // 5 minute cache
  )
  ```

#### Step 6c: Add Invalidation on Writes
- [ ] Find file: `lib/db/actions/tournaments.ts` (or update route)
- [ ] After updating tournament:
  ```typescript
  import { invalidateTournamentCache } from '@/lib/cache/result-cache'

  // After successful update:
  invalidateTournamentCache(tournamentId)
  ```

#### Step 6d: Apply to Key Queries
- [ ] Wrap these functions:
  - [ ] `getTournamentById()`
  - [ ] `getTournamentDivisions()`
  - [ ] `getRegistrations()`
  - [ ] Any frequently called read queries

#### Step 6e: Monitor Cache Hit Rate
- [ ] In browser console, add:
  ```typescript
  import { resultCache } from '@/lib/cache/result-cache'
  resultCache.printMetrics()
  ```
- [ ] Make various queries
- [ ] Run `resultCache.printMetrics()` again
- [ ] Should see hit rate >40%

**Verification:**
- [ ] Hit rate >50% after warmup
- [ ] No stale data (invalidation works)
- [ ] Tournament queries 50-70% faster

### ✅ Step 7: Batch API Calls (2-3 hours)

**Objective:** Replace sequential queries with parallel (50% faster APIs)

#### Step 7a: Identify Sequential Calls
- [ ] Open `app/api/participants/add/route.ts`
- [ ] Look for patterns like:
  ```typescript
  const team = await getTeamById(...)
  const tournament = await getTournamentById(...)
  const player = await createPlayer(...)
  ```

#### Step 7b: Convert to Parallel
- [ ] For independent queries, use Promise.all:
  ```typescript
  // Sequential (slow):
  const team = await getTeamById(teamId)
  const tournament = await getTournamentById(tournamentId)

  // Parallel (fast):
  const [team, tournament] = await Promise.all([
    getTeamById(teamId),
    getTournamentById(tournamentId)
  ])
  ```

#### Step 7c: Apply Pattern
- [ ] Update these routes:
  - [ ] POST `/api/participants/add`
  - [ ] PUT `/api/participants/update`
  - [ ] POST `/api/matches/update`
  - [ ] POST `/api/bracket/generate`

#### Step 7d: Test Performance
```bash
npm run test:performance:api -- --testNamePattern="participant"
```
- [ ] Response times should be 30-50% faster
- [ ] Errors should remain <1%

**Verification:**
- [ ] API response time <300ms (was 400-500ms)
- [ ] Concurrent throughput improved
- [ ] No duplicate queries or issues

---

## Verification Checklist

### After Phase 1 Complete
- [ ] `npm run dev` - app starts without errors
- [ ] Bracket page loads and updates work
- [ ] Hidden tab cleanup works (open dev tools, hide tab, check console)
- [ ] Load test shows 30-40% connection reduction
- [ ] No "too many connections" errors at 150 concurrent users
- [ ] Response times: <300ms p95, <500ms p99

### After Phase 2 Complete
- [ ] Cache hit rate >50%
- [ ] API response times <300ms (from 400+ms)
- [ ] No stale data issues
- [ ] Load test shows 70% query reduction
- [ ] All tests passing: `npm test`

---

## Monitoring Setup

### Add to Your Monitoring
```bash
# Check active connections (do this daily)
psql $DATABASE_URL_POOLED -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Monitor in real-time
watch -n 1 'psql $DATABASE_URL_POOLED -c "SELECT count(*) FROM pg_stat_activity;"'

# Check cache metrics (in browser console)
resultCache.printMetrics()
```

### Alert Thresholds
- [ ] Alert if connections > 180 (approaching limit)
- [ ] Alert if error rate > 1%
- [ ] Alert if p95 latency > 500ms
- [ ] Check cache hit rate daily (target: >50%)

---

## Troubleshooting

### Issue: "too many connections" errors still occurring
- [ ] Verify PgBouncer enabled in Supabase Dashboard
- [ ] Check `.env.local` using pooled connection string
- [ ] Verify subscriptions are only on matches table
- [ ] Check idle connection timeout is 10s for background tabs

### Issue: Updates not arriving within 2 seconds
- [ ] Verify debounce is set to 1500ms (not 500ms)
- [ ] Check browser console for subscription errors
- [ ] Verify realtime is enabled in Supabase
- [ ] Test with different browser (cache issue?)

### Issue: Cache hit rate is low (<30%)
- [ ] Check cache TTL is reasonable (5 min for tournaments)
- [ ] Verify invalidation called on write
- [ ] Check if data is highly volatile (changing frequently)
- [ ] Review which queries benefit most from caching

### Issue: Parallel queries causing issues
- [ ] Ensure queries are truly independent
- [ ] Check for race conditions in writes
- [ ] Verify error handling for failed parallel queries
- [ ] Test with load: `npm run test:performance:load`

---

## Timeline

```
Day 1 (Afternoon - 65 minutes):
  ✓ PgBouncer              5 min
  ✓ Consolidate Subs      30 min
  ✓ Aggressive Cleanup    20 min
  ✓ Debounce Intervals    10 min
  ✓ Load Test & Verify    30 min
  Result: 150 concurrent users ✓

Days 2-3 (Optional - 4-6 hours):
  ✓ Result Caching        2-3 hrs
  ✓ Batch API Calls       2-3 hrs
  Result: 200+ concurrent users ✓
```

---

## Success Indicators

### Phase 1 Success
- [ ] Capacity: 50 → 150 concurrent users
- [ ] Error rate: <1%
- [ ] Connections at 150 users: <170
- [ ] Response time: <300ms
- [ ] No "connection limit" errors

### Phase 2 Success
- [ ] Capacity: 150 → 200+ concurrent users
- [ ] Query load: 70% reduction
- [ ] Cache hit rate: >50%
- [ ] API response time: <200ms
- [ ] DB utilization: Lower despite more users

---

## When Complete

1. **Update README:**
   - Note capacity: "Supports 150+ concurrent users on free tier"
   - Link to optimization docs

2. **Commit with message:**
   ```
   feat: optimize database connections for scale
   
   - Enable PgBouncer connection pooling (+40%)
   - Consolidate realtime subscriptions (+66%)
   - Aggressive idle cleanup (+30-40%)
   - Result caching for hot queries (+60%)
   - Batch API calls for parallelism (+50%)
   
   Supports 150-200 concurrent users on free tier
   ```

3. **Update OPTIMIZATION_RECOMMENDATIONS.md:**
   - Mark Phase 1 items as "COMPLETED"
   - Record actual capacity achieved
   - Note any issues encountered

4. **Schedule next review:**
   - [ ] Monitor for 2 weeks
   - [ ] Review when approaching 150 users
   - [ ] Decide: More optimizations or upgrade to Pro?

---

**Checked By:** ________________  
**Date Completed:** ________________  
**Capacity Achieved:** ________________ concurrent users
