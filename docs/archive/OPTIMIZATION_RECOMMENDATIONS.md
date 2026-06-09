# Optimization Recommendations Log

**Last Updated:** February 20, 2026  
**Current State:** MVP, ~50-80 concurrent user capacity  
**Capacity Target:** 150+ concurrent users before paid plan upgrade

---

## 🔴 Critical Path Items (Do Before Production)

### ✅ Item 1: Enable PgBouncer Connection Pooling
- **Status:** NOT STARTED
- **Priority:** CRITICAL
- **Effort:** 5 minutes
- **Impact:** 40% connection reduction
- **Target Users:** 50 → 70
- **Implementation:**
  - [ ] Go to Supabase Dashboard → Settings → Database
  - [ ] Switch "Connection Mode" to "Pooling"
  - [ ] Update `.env.local` with new connection string
  - [ ] Test with npm run test:performance:load
- **Success Criteria:** No connection errors with 50 concurrent users
- **Rollback Plan:** Switch back to Direct mode in Supabase Dashboard (1 minute)

### ✅ Item 2: Consolidate Realtime Subscriptions
- **Status:** NOT STARTED
- **Priority:** CRITICAL
- **Effort:** 30 minutes
- **Impact:** 66% reduction in realtime connections per user
- **Target Users:** 70 → 120
- **Files to Update:**
  - [ ] `/hooks/use-tournament-realtime.ts`
  - [ ] Reference: `/hooks/use-tournament-realtime.optimized.ts`
- **Changes:**
  - Remove 2 of 3 postgres_changes subscriptions
  - Increase debounce from 500ms → 1500ms
  - Test bracket updates still work
- **Success Criteria:** Bracket updates arrive within 2 seconds, <100 connections for 50 users
- **Testing:** `npm run test:performance:api -- --testNamePattern="realtime"`

### ✅ Item 3: Aggressive Background Cleanup
- **Status:** NOT STARTED
- **Priority:** CRITICAL
- **Effort:** 20 minutes
- **Impact:** 30-40% reduction in idle connections
- **Target Users:** 120 → 150
- **Files to Update:**
  - [ ] `/lib/realtime/subscriptions.ts`
  - [ ] Reference: `/lib/realtime/subscriptions.optimized.ts`
- **Changes:**
  - Reduce inactivity timeout: 30s → 10s
  - Add hidden tab timeout: 5s
  - Test smooth reconnection
- **Success Criteria:** Hidden tabs disconnect within 5s, reconnect smoothly when visible
- **Testing:** Open dev tools, hide tab, verify "DISCONNECTED_HIDDEN" in console

### ⏳ Item 4: Increase Debounce Intervals
- **Status:** NOT STARTED
- **Priority:** HIGH (Bundled with Item 2)
- **Effort:** 10 minutes
- **Impact:** 25% fewer refreshes, better batching
- **Changes:**
  - 500ms → 1500ms debounce
  - 2000ms → 5000ms maxWait
- **Success Criteria:** Updates batch smoothly, max 1 refresh per second

---

## 🟡 Short-term Improvements (Week 2+)

### ⏳ Item 5: Implement Result Caching
- **Status:** NOT STARTED
- **Priority:** HIGH
- **Effort:** 2-3 hours
- **Impact:** 60-70% reduction in tournament queries
- **Target Users:** 150 → 180
- **Files Created:**
  - [ ] `/lib/cache/result-cache.ts` (READY TO USE)
- **Implementation:**
  - Import cache in database query files
  - Wrap getTournament calls with cache
  - Add invalidation on writes
- **Apply to:**
  - [ ] Tournament detail queries
  - [ ] Division/category lists
  - [ ] Registration lists
  - [ ] Bracket state queries
- **Success Criteria:** >50% cache hit rate in development
- **Monitoring:** `resultCache.printMetrics()` in browser console

### ⏳ Item 6: Batch API Calls
- **Status:** NOT STARTED
- **Priority:** HIGH
- **Effort:** 2-3 hours
- **Impact:** 40-50% faster API responses
- **Files Created:**
  - [ ] `/app/api/participants/add/route.optimized.ts` (REFERENCE)
- **Implementation:**
  - Use `Promise.all()` for independent queries
  - Replace sequential calls with parallel
- **Apply to:**
  - [ ] POST /api/participants/add
  - [ ] PUT /api/participants/update
  - [ ] POST /api/matches/update
  - [ ] POST /api/bracket/generate
- **Success Criteria:** API response time < 300ms (was 500+ms)
- **Testing:** `npm run test:performance:api`

### ⏳ Item 7: Server-Side ISR Caching
- **Status:** NOT STARTED
- **Priority:** MEDIUM
- **Effort:** 1-2 hours
- **Impact:** 80-90% reduction in page render DB hits
- **Implementation:**
  - Add `revalidate = 300` to tournament detail pages
  - Pre-generate for top 50 tournaments
  - Add on-demand revalidation on writes
- **Apply to:**
  - [ ] `/app/dashboard/tournaments/[id]/page.tsx`
  - [ ] `/app/dashboard/tournaments/[id]/bracket/page.tsx`
- **Success Criteria:** Zero DB calls for cached pages, instant page load

---

## 🟢 Long-term Strategic Improvements (Month 2+)

### ⏳ Item 8: Read Replicas (Supabase Pro)
- **Status:** BLOCKED (requires Pro plan)
- **Priority:** MEDIUM
- **Effort:** 2-3 hours (setup) + code changes
- **Impact:** 60% reduction in write contention
- **Cost:** $25/month → ~$60/month for compute
- **Implementation:**
  - Enable read replica in Supabase Pro
  - Route heavy reads to replica
  - Keep writes on primary
- **Apply to:**
  - [ ] Tournament list queries
  - [ ] Standings/results queries
  - [ ] Participant searches
- **Trigger Upgrade:** When hitting 180+ connection limit

### ⏳ Item 9: Query Optimization & Indexing
- **Status:** NOT STARTED
- **Priority:** MEDIUM
- **Effort:** 3-4 hours
- **Impact:** 20-30% faster queries
- **Task:** Profile slow queries with pg_stat_statements
- **Common Optimizations:**
  - [ ] Add index on tournaments(status, created_at)
  - [ ] Add index on registrations(tournament_id, status)
  - [ ] Add index on matches(division_id, round)
  - [ ] Check for N+1 queries in bracket generation

### ⏳ Item 10: WebSocket Message Batching
- **Status:** NOT STARTED
- **Priority:** LOW (For 500+ users)
- **Effort:** 4-5 hours
- **Impact:** 80% reduction in realtime bandwidth
- **Implementation:**
  - Batch 5-10 updates into single message
  - Use 100ms flush interval
- **Trigger:** When realtime bandwidth becomes bottleneck

---

## 📊 Measurement & Success Tracking

### Key Metrics to Monitor

```typescript
// Track in monitoring dashboard
interface OptimizationMetrics {
  connectionCount: number          // Target: <180 for 50 users
  cacheHitRate: number             // Target: >50%
  avgQueryTime: number             // Target: <50ms
  p95ApiLatency: number            // Target: <300ms
  realtimeLatency: number          // Target: <500ms
  errorRate: number                // Target: <1%
  concurrentUsers: number          // Target: 150+
}
```

### Benchmarking Script

```bash
# Before optimizations
npm run test:performance:load > before.txt

# After each optimization
npm run test:performance:load > after.txt

# Compare results
diff before.txt after.txt
```

### Expected Results Timeline

| Week | Optimizations Applied | Expected Capacity | Connection Usage |
|------|----------------------|-------------------|------------------|
| 1    | PgBouncer | 70 users | 140 connections |
| 1    | + Consolidate Subs | 120 users | 120 connections |
| 1    | + Aggressive Cleanup | 150 users | 150 connections |
| 2    | + Caching | 180 users | 160 connections |
| 2    | + Batched APIs | 200 users | 180 connections |
| 3    | + ISR Caching | 250 users | 170 connections |

---

## 🚀 Upgrade Decision Tree

**Question:** Should we upgrade to Supabase Pro?

**Indicators to Upgrade:**
- [ ] Consistently hitting >180 active connections
- [ ] Seeing "too many connections" errors
- [ ] Response time degrading during peak hours
- [ ] Cache hit rate plateauing
- [ ] Have 200+ daily active users

**Stay on Free Tier If:**
- [ ] Able to handle traffic with optimizations
- [ ] Fewer than 100 DAU
- [ ] Connections stay <180
- [ ] MVP still validating product-market fit

**Upgrade At:**
- [ ] 200+ active users OR
- [ ] Connection limit breached OR
- [ ] Need >500MB database storage

**Pro Tier Benefits:**
- 250 connections (vs 200)
- 8GB storage (vs 500MB)
- Priority support
- Automated backups
- Cost: $25/month (+$10 compute credits)

---

## 🔧 Maintenance Checklist

### Monthly Review
- [ ] Check cache hit rates (target: >50%)
- [ ] Review slow query logs
- [ ] Monitor connection usage patterns
- [ ] Check error rates (target: <1%)
- [ ] Review user growth

### Quarterly Review
- [ ] Re-run full performance test suite
- [ ] Compare results to targets
- [ ] Update capacity estimates
- [ ] Plan next optimization round
- [ ] Assess upgrade timeline

### Before Going Live
- [ ] All Item 1-4 completed ✓
- [ ] Load tested to 150+ concurrent users ✓
- [ ] No "too many connections" errors ✓
- [ ] Cache hit rate >40% ✓
- [ ] Monitoring alerts configured ✓
- [ ] Runbook for scaling created ✓

---

## 📝 Implementation Notes

### When Implementing Each Item

**Item 1 (PgBouncer):**
- Completely reversible
- No code changes needed
- Verify with one load test run

**Item 2-3 (Realtime Optimizations):**
- Test with actual UI
- Watch for stale updates
- Users might notice slightly slower updates (acceptable)

**Item 5-6 (Caching & Batching):**
- Add comprehensive logging
- Monitor for cache invalidation issues
- Test with concurrent users

**Item 7+ (Advanced):**
- Only pursue if Items 1-6 insufficient
- Requires more planning

### Rollback Strategy

Each item has a rollback plan:
- Item 1: Switch connection mode in Supabase (1 min)
- Item 2: Revert hook changes (git revert, 1 min)
- Item 3: Revert subscription manager (git revert, 1 min)
- Item 5: Remove cache calls (if needed, 1-2 hours)
- Item 6: Revert API changes (git revert, 1 min)

---

## 🎯 Success Criteria

### MVP Launch Readiness
- [x] Can handle 50 concurrent users
- [x] No connection errors
- [x] Response time <500ms
- [x] Error rate <1%

### After Phase 1 Optimizations (Target: ~1 day work)
- [ ] Can handle 150 concurrent users
- [ ] No connection errors at this load
- [ ] Response time <300ms
- [ ] Error rate <1%

### After Phase 2 Optimizations (Target: ~2 days work)
- [ ] Can handle 200 concurrent users
- [ ] Cache hit rate >50%
- [ ] Response time <200ms
- [ ] Error rate <0.5%

---

## Questions for Future Self

**When considering upgrade to Pro:**
- How many DAU do we have?
- What's our current error rate?
- Where do we see the bottleneck (API, DB, realtime)?
- Have all optimizations been fully implemented?

**When approaching capacity again:**
- Which optimization had highest ROI?
- What could we do differently?
- Should we pursue Item 8-10 or upgrade?
- What's our user retention and growth trajectory?

---

## Links & References

- **Optimization Guide:** `DATABASE_CONNECTION_OPTIMIZATION.md`
- **Quick Start:** `OPTIMIZATION_QUICK_START.md`
- **Performance Testing:** `PERFORMANCE_TESTING_GUIDE.md`
- **Supabase Docs:** https://supabase.com/docs/guides/platform/managing-projects/about-connections
- **PgBouncer:** https://www.pgbouncer.org/config.html

---

**Last Review:** Feb 20, 2026  
**Next Review:** [To be scheduled after Phase 1 implementation]  
**Reviewed By:** TourneyDo Team
