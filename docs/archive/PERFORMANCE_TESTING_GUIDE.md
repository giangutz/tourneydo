# Performance Testing Guide

## Overview

This guide covers how to run, interpret, and act on performance tests for TourneyDo. The testing infrastructure includes:

- **K6 Load Testing** - Realistic tournament workflows under load
- **API Performance Tests** - Individual endpoint response times
- **Database Query Tests** - Query efficiency and N+1 detection
- **E2E Performance Tests** - User journey performance and Core Web Vitals
- **Benchmark Utilities** - Reusable performance measurement functions

## Prerequisites

```bash
# Install K6 (macOS)
brew install k6

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Required Environment Variables

```bash
# For load testing
API_URL=http://localhost:3000
TEST_AUTH_TOKEN=your-test-jwt-token

# For database tests
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# For E2E tests
BASE_URL=http://localhost:3000
```

---

## 1. K6 Load Testing

### Purpose

K6 tests simulate realistic tournament workflows under load to identify:
- Request throughput capacity
- Latency under peak load
- Error rates at scale
- Resource bottlenecks

### Run Load Tests

```bash
# Run full load test (5 minutes)
k6 run scripts/performance/load-test.k6.js

# Run with custom environment
k6 run scripts/performance/load-test.k6.js -e API_URL=https://production.com -e AUTH_TOKEN=xxx

# Run with custom stages
k6 run scripts/performance/load-test.k6.js -d 10m -s 10s:50 -s 30s:100 -s 5m:100 -s 30s:0

# Export results to JSON
k6 run scripts/performance/load-test.k6.js --out json=results.json
```

### Interpreting K6 Results

```
     vus                                 10 ▓ ▓
     duration: 5m0s
     http_requests                    48500 ✓
     http_errors                        500 ✗ 1.03%
     http_duration                     avg=245ms p(95)=450ms p(99)=850ms
```

**Key Metrics:**
- **vus**: Virtual users currently running
- **http_requests**: Total requests completed
- **http_errors**: Failed requests (target: <1%)
- **http_duration**: Response time
  - **avg**: Average response time
  - **p(95)**: 95th percentile (SLO target: <500ms)
  - **p(99)**: 99th percentile (SLO target: <1000ms)

**Thresholds (SLO):**
| Metric | Target | Status |
|--------|--------|--------|
| p95 latency | <500ms | ✓ |
| p99 latency | <1000ms | ✓ |
| Error rate | <1% | ✓ |

**Actions if thresholds fail:**
1. **High latency** → Check database query performance, add indexes
2. **High error rate** → Review error logs, check API implementation
3. **Memory issues** → Profile application, check for leaks

### K6 Workflow Groups

The load test includes 5 workflow groups:

```javascript
// 1. Tournament Creation (creates tournaments)
// 2. Participant Registration (adds participants)
// 3. Tournament Listing (pagination testing)
// 4. Match Updates (simulates live scoring)
// 5. Payment Processing (checkout flow)
```

Each group runs concurrently, simulating realistic user behavior.

---

## 2. API Performance Tests

### Purpose

Jest tests validate individual endpoint performance with controlled scenarios.

### Run API Performance Tests

```bash
# Run all API performance tests
npm run test:performance:api

# Run specific test file
npm test scripts/performance/api-performance.test.ts

# Run with coverage
npm test scripts/performance/api-performance.test.ts -- --coverage

# Watch mode (re-run on file changes)
npm test scripts/performance/api-performance.test.ts -- --watch
```

### Test Categories

#### 1. Tournament Creation
```
Test: single tournament creation should complete in <300ms
├─ Single request latency
├─ Load test: 10 concurrent requests
└─ Throughput baseline: requests/second
```

**Expected Results:**
- Single creation: <300ms
- 10 concurrent: p95 <500ms, success rate >90%
- Throughput: >1 RPS (tournament/second)

**If tests fail:**
- Check database indexes on tournaments table
- Review validation logic (should be fast)
- Profile backend request handling

#### 2. Participant Addition
```
Test: single participant add should complete in <250ms
├─ Single request latency
├─ Load test: 20 concurrent requests
└─ Authorization check validation
```

**Expected Results:**
- Single add: <250ms
- 20 concurrent: p95 <400ms, success rate >85%
- Auth check: <100ms (no DB calls)

**If tests fail:**
- Check Supabase connection pooling
- Review Zod validation performance
- Verify authorization logic doesn't hit DB

#### 3. Participant Update
```
Test: single participant update should complete in <250ms
├─ Single request latency
└─ Load test: 20 concurrent requests
```

**If tests fail:**
- Check registration table indexes
- Review update logic for N+1 queries
- Monitor database locks during updates

#### 4. Tournament Listing
```
Test: tournament listing should complete in <200ms
├─ Pagination testing
├─ Scaling across page numbers
└─ Load test: 30 concurrent
```

**If tests fail:**
- Add indexes to created_at, status
- Implement query pagination correctly
- Consider caching for frequently accessed data

#### 5. Bracket Generation
```
Test: bracket generation should handle 16 participants in <500ms
├─ Scaling: 8, 16, 32, 64 participants
├─ Memory usage tracking
└─ Complexity analysis (should be O(n log n))
```

**If tests fail:**
- Profile bracket algorithm
- Check for inefficient sorting/grouping
- Monitor memory during generation

#### 6. Error Paths
```
Test: validation errors should respond quickly (<100ms)
├─ Validation error response time
├─ Not found errors
└─ Load test: 25 concurrent with errors
```

**Expected behavior:** Error paths should be fast (no DB queries)

### Interpreting Test Output

```bash
PASS  scripts/performance/api-performance.test.ts
  API Performance: Tournament Creation
    ✓ single tournament creation should complete in <300ms (245ms)
    ✓ tournament creation under load (10 concurrent) (1250ms)
    ✓ tournament creation throughput baseline (1500ms)

  API Performance: Participant Addition
    ✓ single participant add should complete in <250ms (210ms)
    ✓ participant add under load (20 concurrent) (2100ms)
```

**Analysis:**
- ✓ All tests passing = APIs meet performance SLOs
- ✗ Test failing = Endpoint exceeds threshold

### Debugging Slow Tests

```bash
# Run with detailed timing output
npm test scripts/performance/api-performance.test.ts -- --verbose

# Profile a specific test
npm test scripts/performance/api-performance.test.ts --testNamePattern="tournament creation"

# Add console logs in test file for debugging
```

---

## 3. Database Query Performance Tests

### Purpose

Jest tests validate database query efficiency and identify optimization opportunities.

### Run Database Tests

```bash
# Run all database performance tests
npm run test:performance:db

# Run specific test suite
npm test scripts/performance/database-performance.test.ts -t "Tournament Queries"

# Generate performance report
npm test scripts/performance/database-performance.test.ts -- --verbose 2>&1 | tee db-report.txt
```

### Test Categories

#### Tournament Queries
```
✓ fetch single tournament <50ms (indexed by PK)
✓ fetch tournament with divisions <100ms (1 join)
✓ fetch tournament full tree <200ms (5 joins)
✓ list tournaments paginated <150ms (order by index)
✓ list tournaments filtered <100ms (composite index)
⚠ detect N+1 pattern (anti-pattern example)
```

#### Participant Queries
```
✓ fetch registrations for tournament <100ms (FK index)
✓ fetch with participant data <150ms (1 join)
✓ search by name <100ms (may need FT search)
✓ participant statistics <200ms (aggregation)
```

#### Match Queries
```
✓ fetch matches for division <100ms (FK index)
✓ fetch with participants <120ms (2 joins)
✓ fetch bracket structure <150ms (optimized, 2 queries)
```

#### Write Performance
```
✓ insert single match score <100ms
✓ batch insert registrations <300ms (50 records)
✓ update registration status <100ms
```

### Interpreting Results

Each test outputs:

```
Query: fetch_tournament_single
├─ Duration: 42ms
├─ Rows Returned: 1
├─ Efficiency: 100%
├─ Has Index: ✓
└─ Notes: Querying by primary key, should use index

⚠️ SLOW QUERIES (>150ms):
  - fetch_tournament_full_tree: 185ms (Consider caching)

⚠️ INEFFICIENT QUERIES (<70% efficiency):
  - n_plus_one_pattern_detected: 30% (Use single query with joins)

Average Query Duration: 95.2ms
```

### Performance Metrics Explained

| Metric | What It Means | Target |
|--------|---------------|--------|
| Duration | Query execution time | <100ms |
| Rows Returned | Rows fetched from DB | Minimize |
| Efficiency | (Rows Returned / Rows Scanned) × 100 | >85% |
| Has Index | Uses index for filtering | ✓ Always |

### Common Issues and Fixes

**Issue: N+1 Query Pattern**
```javascript
// ❌ WRONG: 11 queries (1 + 10)
const tournaments = await db.tournaments.limit(10)
const divisions = await Promise.all(
  tournaments.map(t => db.divisions.where({tournament_id: t.id}))
)

// ✓ RIGHT: 1 query
const tournaments = await db.tournaments
  .select('*, tournament_divisions(*)')
  .limit(10)
```

**Issue: Missing Index**
```javascript
// Slow without index on status
const active = await db.tournaments.where({status: 'active'})

// Solution: Add index
CREATE INDEX tournaments_status_idx ON tournaments(status);
```

**Issue: Inefficient Aggregation**
```javascript
// ❌ Client-side: Fetch all rows
const stats = data.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] || 0) + 1
  return acc
}, {})

// ✓ Server-side: Database aggregation
const stats = await db.raw(`
  SELECT status, COUNT(*) FROM registrations
  WHERE tournament_id = $1
  GROUP BY status
`)
```

### Creating Custom Database Benchmarks

```typescript
// In your test file
import { measurePerformance } from '../../lib/performance/benchmark'

test('custom query performance', async () => {
  const result = await measurePerformance(async () => {
    return await supabase
      .from('my_table')
      .select('*')
      .eq('status', 'active')
  })

  console.log(`Query took ${result.metrics.duration}ms`)
  console.log(`Memory delta: ${result.metrics.memoryDelta}MB`)
  expect(result.metrics.duration).toBeLessThan(100)
})
```

---

## 4. End-to-End Performance Tests (Playwright)

### Purpose

E2E tests validate complete user journeys for:
- Page load times
- Interaction responsiveness
- Core Web Vitals (LCP, FCP, CLS)
- Memory usage
- Mobile performance

### Run E2E Performance Tests

```bash
# Start app first
npm run dev

# In another terminal:
# Run all E2E performance tests
npx playwright test e2e/performance.spec.ts

# Run specific test
npx playwright test e2e/performance.spec.ts -g "landing page"

# Run in headed mode (see browser)
npx playwright test e2e/performance.spec.ts --headed

# Generate HTML report
npx playwright test e2e/performance.spec.ts --reporter=html
open playwright-report/index.html
```

### Test Suites

#### 1. Landing Page
```
✓ Landing page loads in under 3 seconds
├─ Measures: FCP, LCP
├─ No layout shifts (CLS < 0.1)
└─ Resources load efficiently
```

**Core Web Vitals Targets:**
- **FCP** (First Contentful Paint): <1.8s
- **LCP** (Largest Contentful Paint): <2.5s
- **CLS** (Cumulative Layout Shift): <0.1

#### 2. Tournament Creation Flow
```
✓ Form becomes interactive within 2 seconds
✓ Form field input responds instantly (<50ms)
✓ Form submission completes within 5 seconds
✓ Multiple interactions don't cause lag
```

#### 3. Participant Registration
```
✓ Participant list loads and displays quickly
✓ Add participant modal opens instantly
✓ Search responds in <300ms
✓ Pagination is smooth
```

#### 4. Bracket Generation
```
✓ Generate bracket (16 participants) in <2 seconds
✓ No layout shifts during rendering
✓ 64 participant bracket remains interactive
```

#### 5. Real-time Match Updates
```
✓ Score updates reflect within 500ms
✓ Rapid updates don't cause lag
✓ UI remains responsive
```

#### 6. Navigation
```
✓ Page-to-page navigation is smooth
✓ All navigation completes within 2 seconds
✓ Average navigation time tracked
```

#### 7. Memory Usage
```
✓ Memory doesn't grow unbounded
✓ Final memory within 50% of initial
✓ No memory leaks detected
```

#### 8. Mobile Performance
```
✓ Mobile landing page loads efficiently (<4s)
✓ Mobile form interactions responsive (<300ms)
✓ Touch interactions feel instant
```

### Interpreting Results

```bash
6 passed (15.3s)

Landing page loaded in 1250ms ✓
Core Web Vitals: FCP=850ms, LCP=2100ms ✓
Memory growth: 35% ✓
```

### Debugging Failed Tests

```bash
# Run with tracing enabled
npx playwright test e2e/performance.spec.ts --trace on

# View trace
npx playwright show-trace trace.zip

# Run in debug mode
npx playwright test e2e/performance.spec.ts --debug
```

### Common Issues

**Issue: Slow page load**
```
Landing page loads in 4500ms ✗ (target: <3000ms)

Solutions:
1. Check Network tab in DevTools
2. Identify slowest resources
3. Implement code splitting
4. Cache static assets
5. Optimize images
```

**Issue: High CLS**
```
CLS: 0.18 ✗ (target: <0.1)

Solutions:
1. Reserve space for dynamic content
2. Avoid inserting content above viewport
3. Use transform instead of layout properties
4. Set explicit dimensions for images
```

**Issue: Memory growth**
```
Memory growth: 75% ✗ (target: <50%)

Solutions:
1. Check for event listener leaks
2. Verify component cleanup
3. Monitor React reconciliation
4. Profile with DevTools
```

---

## 5. Benchmark Utilities

### Using Reusable Benchmark Functions

The `/lib/performance/benchmark.ts` file provides utilities for custom performance testing:

```typescript
import {
  measurePerformance,
  loadTestHandler,
  profileResource,
  compareBenchmarks,
} from '@/lib/performance/benchmark'
```

### 1. measurePerformance()

Measures a single async operation:

```typescript
const result = await measurePerformance(async () => {
  // Your code here
  return fetchData()
})

console.log(result.metrics.duration) // milliseconds
console.log(result.metrics.memoryDelta) // MB
console.log(result.success) // boolean
```

### 2. loadTestHandler()

Runs load tests with concurrency:

```typescript
const result = await loadTestHandler(
  async () => {
    const response = await fetch('/api/tournaments')
    return response.ok ? 1 : 0 // 1 = success, 0 = fail
  },
  { concurrency: 20, iterations: 50 }
)

console.log(result.metrics.throughput) // requests/sec
console.log(result.metrics.p95Latency) // 95th percentile ms
console.log(result.metrics.p99Latency) // 99th percentile ms
console.log(result.metrics.successRate) // 0-1
```

### 3. profileResource()

Monitors resource usage over time:

```typescript
const profile = await profileResource(async () => {
  // Code to profile
})

console.log(profile.cpuUsage)
console.log(profile.memoryPeak)
```

### 4. compareBenchmarks()

Compares against baseline:

```typescript
const targets = {
  apiEndpoint: { p95: 300, p99: 500 },
}

const current = {
  apiEndpoint: { p95: 250, p99: 480 },
}

const comparison = compareBenchmarks(targets, current)
// Returns: { apiEndpoint: { p95: -50, p99: -20 } }
// Negative = faster than target ✓
```

---

## Performance Targets & SLOs

### API SLOs

| Endpoint | p95 | p99 | Error Rate |
|----------|-----|-----|-----------|
| POST /tournaments | 300ms | 500ms | <1% |
| POST /participants/add | 250ms | 400ms | <1% |
| PUT /participants/update | 250ms | 400ms | <1% |
| GET /tournaments | 200ms | 350ms | <1% |
| POST /generate-bracket | 500ms | 1000ms | <1% |

### Database SLOs

| Query | Target | Status |
|-------|--------|--------|
| Single tournament fetch | <50ms | ✓ |
| Tournament with relations | <150ms | ✓ |
| List with pagination | <100ms | ✓ |
| Participant search | <100ms | ✓ |

### Frontend SLOs (Core Web Vitals)

| Metric | Good | Fair | Poor |
|--------|------|------|------|
| FCP | <1.8s | 1.8-3s | >3s |
| LCP | <2.5s | 2.5-4s | >4s |
| CLS | <0.1 | 0.1-0.25 | >0.25 |
| TTI | <3.8s | 3.8-7.3s | >7.3s |

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Performance Tests

on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run API performance tests
        run: npm run test:performance:api
      
      - name: Run database tests
        run: npm run test:performance:db
      
      - name: Run K6 load tests
        run: k6 run scripts/performance/load-test.k6.js
        
      - name: Upload results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: performance-results
          path: |
            test-results/
            *.json
```

### npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:performance:api": "jest scripts/performance/api-performance.test.ts",
    "test:performance:db": "jest scripts/performance/database-performance.test.ts",
    "test:performance:e2e": "playwright test e2e/performance.spec.ts",
    "test:performance:load": "k6 run scripts/performance/load-test.k6.js",
    "test:performance:all": "npm run test:performance:api && npm run test:performance:db && npm run test:performance:e2e && npm run test:performance:load"
  }
}
```

---

## Performance Optimization Workflow

### 1. Identify Bottleneck
```bash
npm run test:performance:api
npm run test:performance:db
npx playwright test e2e/performance.spec.ts
k6 run scripts/performance/load-test.k6.js
```

### 2. Locate Root Cause
- API slow? → Check database queries
- Database slow? → Add indexes, optimize queries
- Frontend slow? → Profile with DevTools
- Load test fails? → Check scaling or resource limits

### 3. Implement Fix
```bash
git checkout -b perf/fix-slow-endpoint
# Make changes
npm run test:performance:api
```

### 4. Measure Improvement
```bash
# Compare before/after
npm run test:performance:api
# Verify against targets
```

### 5. Deploy & Monitor
```bash
git push && create pull request
# After merge, monitor in production
```

---

## Monitoring & Alerts

### Real-time Performance Monitoring

Set up Sentry performance monitoring:

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of requests
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
})
```

### Performance Budgets

Define application performance budgets:

```javascript
// performance-budget.json
{
  "bundles": [
    {
      "name": "main",
      "maxSize": "250kb"
    },
    {
      "name": "pages/dashboard",
      "maxSize": "150kb"
    }
  ]
}
```

### Alert Thresholds

Configure alerts when:
- API p95 latency > 500ms
- Error rate > 1%
- Database query > 200ms
- Memory growth > 50%

---

## Troubleshooting

### K6 Not Installed

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Windows
choco install k6
```

### Tests Fail with Auth Errors

```bash
# Generate test token
node -e "
  const jwt = require('jsonwebtoken');
  console.log(jwt.sign(
    { sub: 'test-user', email: 'test@example.com' },
    'your-secret'
  ));
"

export TEST_AUTH_TOKEN=<token>
npm run test:performance:api
```

### Database Connection Issues

```bash
# Verify connection
psql $DATABASE_URL -c "SELECT 1"

# Check pooling
PGBOUNCER_POOL_MODE=transaction npm run test:performance:db
```

### Memory Issues During Tests

```bash
# Increase Node.js heap
NODE_OPTIONS=--max-old-space-size=4096 npm run test:performance:all

# Run tests serially to reduce memory
npm run test:performance:api -- --maxWorkers=1
```

---

## Further Reading

- [K6 Documentation](https://k6.io/docs/)
- [Web Vitals](https://web.dev/vitals/)
- [Playwright Performance](https://playwright.dev/docs/test-performance)
- [Jest Performance Testing](https://jestjs.io/docs/timer-mocks)
- [Database Query Optimization](https://www.postgresql.org/docs/current/performance-tips.html)
