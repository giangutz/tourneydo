# Database Connection Optimization Guide

## Executive Summary

**Current State:** Free tier Supabase (200 concurrent connections) can handle **50-80 concurrent users** before degradation.

**Optimization Target:** Reduce per-user connection footprint from ~2-5 connections to **<1.5 connections** while maintaining real-time functionality.

**Expected Impact:** Support **100-150 concurrent users** on free tier without upgrading.

---

## Problem Analysis

### Connection Lifecycle

Each user connection consumes:

```
Authenticated Query (POST to /api/participants/add):
├─ Auth verification      → 1 connection
├─ User query             → 1 connection  
├─ Team lookup            → 1 connection (cascading)
├─ Player create/update   → 1 connection
├─ Registration create    → 1 connection
├─ Revalidate path        → 1 connection (Next.js)
└─ Total per request      → 6-7 connections (short-lived, ~100ms)

Realtime Subscription (WebSocket):
├─ Match updates          → 1 persistent connection
├─ Registration updates   → 1 persistent connection
├─ Tournament updates     → 1 persistent connection
└─ Total per user         → 3 persistent connections

Total per Active User: ~3-4 persistent + ~6 transient = 9 potential peak connections
```

**With 50 users = 150-200 connections = AT CAPACITY**

### Where Connections Are Wasted

1. **Multiple subscriptions per user** - Each table subscription creates separate connection
2. **Unclosed channels** - Background tabs keep connections open indefinitely
3. **Redundant queries** - Multiple sequential database calls instead of batch
4. **No connection pooling** - Using direct connections instead of pooled connections
5. **Background subscriptions** - Users watching but not actively interacting still consume connections

---

## Optimization Strategy

### Phase 1: Immediate Wins (No Code Changes Required)

#### 1.1 Enable Connection Pooling (Supabase Free Tier)

Supabase free tier includes **PgBouncer** connection pooling:

```bash
# In Supabase Dashboard:
# Settings > Database > Connection String > Connection Mode
# Switch to: "Pooling Mode" (PgBouncer)

# Old (Direct): postgresql://user:pass@host/db
# New (Pooled): postgresql://user:pass@host:6543/dbname?pgbouncer=true
```

**Impact:** Reduces per-query connection overhead by ~40%

**Configuration:**
- Pool mode: `transaction` (good for APIs)
- Pool size: 10 connections for 50 concurrent users
- Connection timeout: 30 seconds idle

**Implementation Time:** 5 minutes (just update connection string in `.env`)

---

### Phase 2: Code Optimizations (Low Effort, High Impact)

#### 2.1 Consolidate Realtime Subscriptions

**Problem:** Three separate subscriptions = 3+ connections per user

**File:** `/hooks/use-tournament-realtime.ts`

**Before:**
```typescript
// Creates 3 separate subscriptions
.on('postgres_changes', { table: 'matches', ... })
.on('postgres_changes', { table: 'registrations', ... })
.on('postgres_changes', { table: 'tournaments', ... })
.subscribe()  // <-- 3 connections
```

**After:**
```typescript
// Single subscription with selective listening
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'matches'  // Only critical updates
}, handler)
.subscribe()  // <-- 1 connection, 60% reduction

// Registrations/tournaments use polling on demand
```

**Code Change:**
```typescript
export function useTournamentRealtime(
  tournamentId: string,
  onMatchUpdate?: (payload: any) => void
) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  
  const debouncedRefresh = useDebouncedCallback(
    () => router.refresh(),
    1000,  // Increased from 500ms to batch updates
    { maxWait: 3000 }
  )

  useEffect(() => {
    if (!tournamentId) return

    let channel: any = null

    const setupSubscription = () => {
      if (document.hidden) return

      // OPTIMIZATION: Only subscribe to critical updates (matches)
      // Use polling for low-frequency events (registrations, tournaments)
      channel = supabase
        .channel(`tournament-${tournamentId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'matches',
            filter: `tournament_id=eq.${tournamentId}`
          },
          (payload) => {
            if (onMatchUpdate) {
              onMatchUpdate(payload)
            } else {
              debouncedRefresh()
            }
          }
        )
        .subscribe()
    }

    // ... rest of cleanup code ...
  }, [tournamentId, router])
}
```

**Expected Impact:** 
- 1 persistent connection per user (instead of 3)
- 66% reduction in realtime connections
- ~150 concurrent users instead of 50

---

#### 2.2 Batch API Calls in Forms

**Problem:** Multiple sequential queries in `/api/participants/add`

**File:** `/app/api/participants/add/route.ts`

**Before:**
```typescript
const team = await getTeamById(teamId)           // Query 1
const player = await getOrCreatePlayer(...)       // Query 2
const teamMember = await addPlayerToTeam(...)    // Query 3
const registration = await createRegistration(...) // Query 4
```

**After (Optimized):**
```typescript
// Use transaction to batch queries
const { data, error } = await supabase
  .rpc('add_participant_atomic', {
    team_id: teamId,
    player_data: {...},
    registration_data: {...}
  })

// Or use Promise.all for independent queries
const [team, tournaments] = await Promise.all([
  getTeamById(teamId),
  getTournamentById(tournamentId)
])
```

**Expected Impact:**
- 4 sequential queries → 2 parallel queries
- 50% faster response time
- Fewer connection slots needed

---

#### 2.3 Aggressive Background Cleanup

**Problem:** Hidden tabs keep subscriptions alive indefinitely

**File:** `/lib/realtime/subscriptions.ts`

**Current:** 30-second inactivity timeout

**Optimized:**
```typescript
const INACTIVITY_TIMEOUT = 10 * 1000  // 10 seconds (aggressive)
const PAGE_HIDDEN_TIMEOUT = 5 * 1000  // 5 seconds when tab hidden

export class SubscriptionManager {
  // ... existing code ...

  private resetInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
    }

    // OPTIMIZATION: Much faster cleanup when hidden
    const timeout = document.hidden 
      ? PAGE_HIDDEN_TIMEOUT 
      : INACTIVITY_TIMEOUT

    this.inactivityTimer = setTimeout(() => {
      console.log('[SubscriptionManager] Disconnecting due to inactivity...')
      this.setStatus('DISCONNECTED_IDLE')
      this.disconnect()
    }, timeout)
  }
}
```

**Expected Impact:**
- Hidden tabs disconnect in 5 seconds (instead of 30)
- Reduces idle connections by ~30%
- Smooth reconnect when user returns

---

#### 2.4 Connection Pooling at Query Level

**Problem:** Each `createClient()` creates separate connection

**File:** `/lib/db/client.ts`

**Before:**
```typescript
// Every new client = potential new connection
export function createClerkSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { async accessToken() { ... } }
  )
}
```

**After (Pool Pattern):**
```typescript
import pRetry from 'p-retry'

// Connection pool for server-side operations
const queryPool: SupabaseClient<Database>[] = []
const MAX_POOL_SIZE = 5

export async function getPooledClient(): Promise<SupabaseClient<Database>> {
  // Reuse existing connection from pool
  if (queryPool.length > 0) {
    return queryPool.pop()!
  }
  
  // Create new if under limit
  if (queryPool.length < MAX_POOL_SIZE) {
    return createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  // Wait for one to be returned
  return new Promise(resolve => {
    const checkInterval = setInterval(() => {
      if (queryPool.length > 0) {
        clearInterval(checkInterval)
        resolve(queryPool.pop()!)
      }
    }, 10)
  })
}

export function releasePooledClient(client: SupabaseClient<Database>) {
  if (queryPool.length < MAX_POOL_SIZE) {
    queryPool.push(client)
  }
}
```

**Expected Impact:**
- 5 connections handle 50+ parallel requests
- 60% reduction in connection creation overhead

---

#### 2.5 Increase Debounce Intervals

**Problem:** Refreshes happen too frequently, preventing connection reuse

**File:** `/hooks/use-tournament-realtime.ts`

**Before:**
```typescript
const debouncedRefresh = useDebouncedCallback(
  () => router.refresh(),
  500,      // 500ms = max 2 refreshes/second
  { maxWait: 2000 }
)
```

**After:**
```typescript
const debouncedRefresh = useDebouncedCallback(
  () => router.refresh(),
  1500,     // 1.5s = allows more updates to batch
  { maxWait: 5000 }
)
```

**Expected Impact:**
- Batch up to 3 updates into 1 refresh
- Reduce query frequency by 50%
- Each connection handles more work

---

### Phase 3: Architectural Improvements (Medium Effort, Long-Term)

#### 3.1 Implement Query Result Caching

**For:** Frequently accessed data (tournaments, divisions, categories)

```typescript
// /lib/cache/tournament-cache.ts
import NodeCache from 'node-cache'

const cache = new NodeCache({ stdTTL: 300 }) // 5 minute TTL

export async function getCachedTournament(id: string) {
  const cached = cache.get(`tournament:${id}`)
  if (cached) return cached

  const data = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  cache.set(`tournament:${id}`, data)
  return data
}

export function invalidateTournamentCache(id: string) {
  cache.del(`tournament:${id}`)
}
```

**Expected Impact:**
- 70% reduction in tournament detail queries
- Faster response times (cached hits ~1ms vs DB ~50ms)

---

#### 3.2 Implement Read Replicas (Supabase Pro Plan)

**Future Optimization:** When upgrading to Pro ($25/month)

```typescript
// Use read replica for non-critical reads
const readReplica = createClient(
  process.env.SUPABASE_READ_REPLICA_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// Heavy reads use replica
const tournaments = await readReplica
  .from('tournaments')
  .select('*')
  .gt('participant_count', 0)

// Critical writes still use primary
await supabase.from('matches').update({...})
```

---

#### 3.3 Implement Server-Side Caching (ISR)

**For:** Tournament detail pages, brackets, standings

```typescript
// /app/dashboard/tournaments/[id]/page.tsx
export async function generateStaticParams() {
  // Pre-generate for popular tournaments
  const { data } = await supabase
    .from('tournaments')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(50)
  
  return data?.map(t => ({ id: t.id })) ?? []
}

export const revalidate = 300  // Revalidate every 5 minutes

export default async function TournamentPage({ params }) {
  // Cached automatically, revalidated on demand
  const tournament = await getTournament(params.id)
  return <TournamentDetail tournament={tournament} />
}
```

**Expected Impact:**
- Zero database hits for cached pages
- 100x faster response times
- 80% reduction in query load

---

#### 3.4 Implement WebSocket Batching

**For:** Broadcasting multiple updates in one message

```typescript
// /lib/realtime/broadcast.ts
export class BroadcastManager {
  private updateQueue: Map<string, any[]> = new Map()
  private flushInterval: NodeJS.Timeout | null = null

  private async flushUpdates() {
    for (const [channelId, updates] of this.updateQueue) {
      if (updates.length === 0) continue

      const channel = this.channels.get(channelId)
      if (!channel) continue

      // Send batched updates
      await channel.send({
        type: 'broadcast',
        event: 'batch_update',
        payload: {
          updates,
          timestamp: Date.now(),
          count: updates.length
        }
      })

      this.updateQueue.delete(channelId)
    }
  }

  public queueUpdate(tournamentId: string, update: any) {
    const channelId = `tournament-broadcast-${tournamentId}`
    if (!this.updateQueue.has(channelId)) {
      this.updateQueue.set(channelId, [])
    }
    this.updateQueue.get(channelId)!.push(update)

    // Flush every 100ms or when queue grows large
    if (!this.flushInterval) {
      this.flushInterval = setTimeout(() => {
        this.flushUpdates()
        this.flushInterval = null
      }, 100)
    }
  }
}
```

**Expected Impact:**
- Batch 5-10 updates into 1 message
- 80% reduction in realtime bandwidth
- Fewer concurrent connections needed

---

## Implementation Roadmap

### Immediate (Week 1) - MVP Optimizations

```markdown
Priority 1: Enable PgBouncer (5 min)
├─ Update connection string to pooling mode
├─ Test with existing load
└─ Expected: 50→70 concurrent users

Priority 2: Consolidate Realtime Subscriptions (30 min)
├─ Modify use-tournament-realtime.ts
├─ Test with bracket updates
└─ Expected: 70→100 concurrent users

Priority 3: Increase Debounce Intervals (10 min)
├─ Update 500ms → 1500ms
├─ Adjust maxWait accordingly
└─ Expected: 100→120 concurrent users
```

### Short-term (Week 2-3) - Code Optimizations

```markdown
Priority 4: Batch API Calls (1-2 hours)
├─ Create transaction wrapper
├─ Update participants/add route
├─ Benchmark improvements
└─ Expected: 120→140 concurrent users

Priority 5: Aggressive Background Cleanup (30 min)
├─ Reduce inactivity timeout to 10s
├─ Test reconnection flows
└─ Expected: 140→150 concurrent users

Priority 6: Query Result Caching (2-3 hours)
├─ Implement NodeCache
├─ Add invalidation on writes
├─ Monitor hit rates
└─ Expected: Query load ↓50%
```

### Medium-term (Month 2) - Architectural

```markdown
Priority 7: ISR Caching (1-2 days)
├─ Add revalidate to tournament pages
├─ Set up on-demand revalidation
└─ Expected: DB load ↓70%, Response time ↓80%

Priority 8: Read Replicas (When upgrading to Pro)
├─ Set up read replica
├─ Route heavy reads to replica
└─ Expected: Write contention ↓60%
```

---

## Monitoring & Measurement

### Key Metrics to Track

```typescript
// /lib/performance/connection-monitor.ts
interface ConnectionMetrics {
  activeConnections: number
  connectionPoolUtilization: number
  avgQueryDuration: number
  subscriptionCount: number
  realtimeLatency: number
  cacheHitRate: number
  p95Latency: number
  errorRate: number
}

export async function getConnectionMetrics(): Promise<ConnectionMetrics> {
  // Query Supabase metrics endpoint
  const metrics = await supabase.rpc('get_connection_metrics')
  return metrics
}

// Monitor in production
export async function monitorConnections() {
  setInterval(async () => {
    const metrics = await getConnectionMetrics()
    
    // Alert if approaching limits
    if (metrics.activeConnections > 180) {
      console.warn('🔴 Approaching connection limit')
      Sentry.captureMessage('High connection usage', 'warning', {
        extra: metrics
      })
    }

    // Log for analysis
    console.log('📊 Connection Metrics:', metrics)
  }, 30000) // Every 30 seconds
}
```

### Benchmark Results

Track before/after for each optimization:

```markdown
| Optimization | Metric | Before | After | Improvement |
|--------------|--------|--------|-------|-------------|
| PgBouncer | Connections at 50 users | 200 | 120 | 40% ↓ |
| Consolidate Subs | Connections per user | 3 | 1 | 66% ↓ |
| Increase Debounce | Query frequency | 2/s | 1/s | 50% ↓ |
| Batch API Calls | Queries per request | 4 | 2 | 50% ↓ |
| Result Caching | Tournament queries | 100/min | 30/min | 70% ↓ |
| ISR Caching | DB hits per page | 5 | 0.5 | 90% ↓ |
```

---

## When to Upgrade to Supabase Pro

**Upgrade at 150+ concurrent users or when:**
- Free tier connection limit consistently hit
- Experiencing connection timeout errors
- Response times degrading during peak hours
- Need more than 500MB database storage

**Pro tier provides:**
- 250 connections (vs 200)
- 8GB database (vs 500MB)
- Connection pooling included
- Priority support
- Cost: $25/month ($10 compute credits included)

---

## Testing Optimizations

### Load Test Before/After

```bash
# Test current capacity
npm run test:performance:load

# Implement optimization
git commit -m "Optimize: consolidate realtime subscriptions"

# Test improved capacity
npm run test:performance:load

# Compare metrics
k6 run scripts/performance/load-test.k6.js --summary-trend-stats='min,avg,max,p(95),p(99)'
```

### Connection Pool Test

```bash
# Monitor active connections during load test
watch -n 1 'psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"'
```

---

## Troubleshooting

### Symptom: "Too many connections" Error

```
ERROR: too many connections for role "your_role"
```

**Fix (in order):**
1. Enable PgBouncer connection pooling
2. Check for unclosed subscriptions
3. Increase inactivity timeout aggressiveness
4. Implement result caching
5. Upgrade to Supabase Pro

### Symptom: Realtime Updates Not Arriving

```typescript
// Usually caused by aggressive cleanup
// Solutions:

// 1. Increase min inactivity timeout
const INACTIVITY_TIMEOUT = 20 * 1000  // Was 10s

// 2. Implement reconnection logic
channel.on('system', { event: 'postgres_changes' }, (payload) => {
  if (payload.eventType === 'ERROR') {
    console.log('Reconnecting after error...')
    setupSubscription()  // Retry subscription
  }
})

// 3. Use heartbeat to keep connection alive
setInterval(() => {
  channel.send({
    type: 'system',
    event: 'keepalive'
  })
}, 30000)
```

### Symptom: High Cache Miss Rate

```typescript
// If caching isn't working:

// 1. Check cache TTL
const cache = new NodeCache({ 
  stdTTL: 600,  // Increase if too short
  checkperiod: 120
})

// 2. Add cache debugging
export async function getCachedTournament(id: string) {
  const cached = cache.get(`tournament:${id}`)
  if (cached) {
    console.log('[Cache] HIT:', id)
    return cached
  }
  console.log('[Cache] MISS:', id)
  // ... fetch from DB ...
}

// 3. Monitor hit rate
const stats = cache.getStats()
console.log(`Cache hit rate: ${(stats.hits / (stats.hits + stats.misses) * 100).toFixed(1)}%`)
```

---

## Future Recommendations Summary

Keep these documented for future reference as the application scales:

### 🔴 Critical (Implement Before 200 Users)
- [ ] Enable PgBouncer connection pooling
- [ ] Consolidate realtime subscriptions to 1 per user
- [ ] Implement aggressive background cleanup (5-10s timeouts)
- [ ] Add result caching for frequently accessed data
- [ ] Implement ISR for tournament detail pages

### 🟡 High Priority (Implement Before 500 Users)
- [ ] Upgrade to Supabase Pro ($25/month)
- [ ] Add read replicas for heavy reads
- [ ] Implement query batching/transactions
- [ ] Add connection pool with p-queue
- [ ] Implement WebSocket message batching

### 🟢 Medium Priority (Nice to Have)
- [ ] Implement Redis caching layer
- [ ] Add CDN for static assets
- [ ] Implement server-side query optimization
- [ ] Add database indexes for common filters
- [ ] Implement query queue/rate limiting

### 🔵 Low Priority (Scale Beyond 1000 Users)
- [ ] Multi-region database replication
- [ ] Event sourcing for match updates
- [ ] GraphQL federation for API
- [ ] Implement CQRS pattern
- [ ] Custom database sharding strategy

---

## Quick Reference Commands

```bash
# Check current connection usage
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Monitor connections in real-time
watch -n 1 'psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"'

# Check connection limits
psql $DATABASE_URL -c "SHOW max_connections;"

# Test with load
npm run test:performance:load

# Profile database queries
psql $DATABASE_URL -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

---

## References

- [Supabase Connection Pooling](https://supabase.com/docs/guides/platform/managing-projects/about-connections)
- [PgBouncer Configuration](https://www.pgbouncer.org/config.html)
- [Next.js ISR](https://nextjs.org/docs/basic-features/data-fetching/incremental-static-regeneration)
- [Realtime Best Practices](https://supabase.com/docs/guides/realtime/best-practices)
