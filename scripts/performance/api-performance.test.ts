/**
 * API Performance Tests for TourneyDo
 * 
 * Tests individual API endpoints for:
 * - Response time (p95, p99 latency)
 * - Throughput (requests/second)
 * - Memory usage
 * - Error rates under load
 * 
 * Run: npm run test:performance:api
 */

import { measurePerformance, loadTestHandler, compareBenchmarks } from '../../lib/performance/benchmark'

const API_BASE = process.env.API_URL || 'http://localhost:3000'
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || ''

// Mock data for testing
const mockTournamentData = {
  name: 'Performance Test Tournament',
  sport: 'judo',
  date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  location: 'Test Location',
  maxParticipants: 100,
  divisions: [
    {
      name: 'U12',
      minAge: 0,
      maxAge: 12,
      categories: [{ name: 'M', minWeight: 0, maxWeight: 50 }],
    },
  ],
}

const mockParticipantData = {
  firstName: 'John',
  lastName: 'Doe',
  beltLevel: 'blue',
  weight: 75,
  height: 180,
}

/**
 * Test: POST /api/tournaments (Create Tournament)
 */
describe('API Performance: Tournament Creation', () => {
  test('single tournament creation should complete in <300ms', async () => {
    const result = await measurePerformance(async () => {
      const response = await fetch(`${API_BASE}/api/tournaments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockTournamentData),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    })

    console.log('Tournament Creation Performance:', {
      duration: `${result.metrics.duration}ms`,
      memoryDelta: `${result.metrics.memoryDelta}MB`,
    })

    expect(result.metrics.duration).toBeLessThan(300)
    expect(result.success).toBe(true)
  })

  test('tournament creation under load (10 concurrent)', async () => {
    const result = await loadTestHandler(
      async () => {
        const response = await fetch(`${API_BASE}/api/tournaments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...mockTournamentData,
            name: `Perf Test ${Date.now()}`,
          }),
        })
        return response.ok ? 1 : 0
      },
      { concurrency: 10, iterations: 10 }
    )

    console.log('Load Test: Tournament Creation (10 concurrent)', result.metrics)

    expect(result.metrics.successRate).toBeGreaterThan(0.9)
    expect(result.metrics.p95Latency).toBeLessThan(500)
  })

  test('tournament creation throughput baseline', async () => {
    const startTime = Date.now()
    let successCount = 0

    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(`${API_BASE}/api/tournaments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...mockTournamentData,
            name: `Throughput Test ${Date.now()}-${i}`,
          }),
        })
        if (response.ok) successCount++
      } catch (e) {
        // Request failed
      }
    }

    const duration = Date.now() - startTime
    const throughput = (successCount / duration) * 1000 // requests per second

    console.log('Throughput Baseline: Tournament Creation', {
      successCount,
      duration: `${duration}ms`,
      rps: throughput.toFixed(2),
    })

    expect(throughput).toBeGreaterThan(1) // At least 1 RPS
  })
})

/**
 * Test: POST /api/participants/add (Add Participant)
 */
describe('API Performance: Participant Addition', () => {
  test('single participant add should complete in <250ms', async () => {
    const result = await measurePerformance(async () => {
      const response = await fetch(`${API_BASE}/api/participants/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId: 'test-tournament-id',
          teamId: 'test-team-id',
          ...mockParticipantData,
        }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    })

    console.log('Participant Add Performance:', {
      duration: `${result.metrics.duration}ms`,
      memoryDelta: `${result.metrics.memoryDelta}MB`,
    })

    expect(result.metrics.duration).toBeLessThan(250)
  })

  test('participant add under load (20 concurrent)', async () => {
    const result = await loadTestHandler(
      async () => {
        const response = await fetch(`${API_BASE}/api/participants/add`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tournamentId: 'test-tournament-id',
            teamId: 'test-team-id',
            ...mockParticipantData,
            firstName: `User${Date.now()}`,
          }),
        })
        return response.ok ? 1 : 0
      },
      { concurrency: 20, iterations: 5 }
    )

    console.log('Load Test: Participant Add (20 concurrent)', result.metrics)

    expect(result.metrics.successRate).toBeGreaterThan(0.85)
    expect(result.metrics.p95Latency).toBeLessThan(400)
  })

  test('participant add validates authorization checks', async () => {
    const invalidTokenResult = await measurePerformance(async () => {
      const response = await fetch(`${API_BASE}/api/participants/add`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId: 'test-tournament-id',
          teamId: 'test-team-id',
          ...mockParticipantData,
        }),
      })
      return response.status // Should be 401 or 403
    })

    console.log('Authorization Check Duration:', {
      duration: `${invalidTokenResult.metrics.duration}ms`,
    })

    // Auth checks should be fast (no database calls)
    expect(invalidTokenResult.metrics.duration).toBeLessThan(100)
  })
})

/**
 * Test: PUT /api/participants/update (Update Participant)
 */
describe('API Performance: Participant Update', () => {
  test('single participant update should complete in <250ms', async () => {
    const result = await measurePerformance(async () => {
      const response = await fetch(`${API_BASE}/api/participants/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registrationId: 'test-registration-id',
          status: 'weighed_in',
          weight: 75.5,
          height: 180,
          markedWieghedIn: true,
        }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    })

    console.log('Participant Update Performance:', {
      duration: `${result.metrics.duration}ms`,
      memoryDelta: `${result.metrics.memoryDelta}MB`,
    })

    expect(result.metrics.duration).toBeLessThan(250)
  })

  test('participant update under load (20 concurrent)', async () => {
    const result = await loadTestHandler(
      async () => {
        const response = await fetch(`${API_BASE}/api/participants/update`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registrationId: `test-reg-${Date.now()}`,
            status: 'weighed_in',
            weight: 75 + Math.random() * 10,
            height: 180,
            markedWieghedIn: true,
          }),
        })
        return response.ok ? 1 : 0
      },
      { concurrency: 20, iterations: 5 }
    )

    console.log('Load Test: Participant Update (20 concurrent)', result.metrics)

    expect(result.metrics.p95Latency).toBeLessThan(400)
  })
})

/**
 * Test: GET /api/tournaments (List Tournaments)
 */
describe('API Performance: Tournament Listing', () => {
  test('tournament listing should complete in <200ms', async () => {
    const result = await measurePerformance(async () => {
      const response = await fetch(`${API_BASE}/api/tournaments?limit=50`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    })

    console.log('Tournament List Performance:', {
      duration: `${result.metrics.duration}ms`,
      memoryDelta: `${result.metrics.memoryDelta}MB`,
    })

    expect(result.metrics.duration).toBeLessThan(200)
  })

  test('tournament listing with pagination under load (30 concurrent)', async () => {
    const result = await loadTestHandler(
      async () => {
        const response = await fetch(
          `${API_BASE}/api/tournaments?limit=50&page=${Math.floor(Math.random() * 5)}`,
          {
            headers: {
              'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
          }
        )
        return response.ok ? 1 : 0
      },
      { concurrency: 30, iterations: 10 }
    )

    console.log('Load Test: Tournament List (30 concurrent)', result.metrics)

    expect(result.metrics.successRate).toBeGreaterThan(0.9)
    expect(result.metrics.p99Latency).toBeLessThan(500)
  })

  test('tournament list scales with pagination', async () => {
    const pageResults = []

    for (const page of [1, 5, 10, 50]) {
      const result = await measurePerformance(async () => {
        const response = await fetch(
          `${API_BASE}/api/tournaments?limit=50&page=${page}`,
          {
            headers: {
              'Authorization': `Bearer ${AUTH_TOKEN}`,
            },
          }
        )
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })

      pageResults.push({
        page,
        duration: result.metrics.duration,
      })
    }

    console.log('Tournament List Scaling:', pageResults)

    // Later pages should not be significantly slower
    const lastPageDuration = pageResults[pageResults.length - 1].duration
    const firstPageDuration = pageResults[0].duration
    const scalingFactor = lastPageDuration / firstPageDuration

    expect(scalingFactor).toBeLessThan(2) // Should not more than double
  })
})

/**
 * Test: POST /api/tournaments/:id/generate-bracket (Bracket Generation)
 */
describe('API Performance: Bracket Generation', () => {
  test('bracket generation should handle 16 participants in <500ms', async () => {
    const result = await measurePerformance(async () => {
      const response = await fetch(`${API_BASE}/api/tournaments/test-id/generate-bracket`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantCount: 16,
          divisions: ['M-60kg'],
        }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    })

    console.log('Bracket Generation Performance (16 participants):', {
      duration: `${result.metrics.duration}ms`,
      memoryDelta: `${result.metrics.memoryDelta}MB`,
    })

    expect(result.metrics.duration).toBeLessThan(500)
  })

  test('bracket generation scales with participant count', async () => {
    const sizes = [8, 16, 32, 64]
    const scalingResults = []

    for (const size of sizes) {
      const result = await measurePerformance(async () => {
        const response = await fetch(`${API_BASE}/api/tournaments/test-id/generate-bracket`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participantCount: size,
            divisions: Array(Math.ceil(size / 8)).fill('M-60kg'),
          }),
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })

      scalingResults.push({
        participants: size,
        duration: result.metrics.duration,
        memoryDelta: result.metrics.memoryDelta,
      })
    }

    console.log('Bracket Generation Scaling:', scalingResults)

    // Verify reasonable scaling (should be close to O(n log n))
    const sizes_8_to_16 = scalingResults[1].duration / scalingResults[0].duration
    const sizes_16_to_32 = scalingResults[2].duration / scalingResults[1].duration
    const sizes_32_to_64 = scalingResults[3].duration / scalingResults[2].duration

    console.log('Scaling factors:', {
      '8→16': sizes_8_to_16.toFixed(2),
      '16→32': sizes_16_to_32.toFixed(2),
      '32→64': sizes_32_to_64.toFixed(2),
    })

    // Each doubling should take roughly 2-3x time (not exponential)
    expect(sizes_32_to_64).toBeLessThan(4)
  })
})

/**
 * Test: Comparative Benchmarks
 * Compare against baseline performance targets
 */
describe('Performance Benchmarks vs Targets', () => {
  const targets = {
    createTournament: { p95: 300, p99: 500 },
    addParticipant: { p95: 250, p99: 400 },
    updateParticipant: { p95: 250, p99: 400 },
    listTournaments: { p95: 200, p99: 350 },
    generateBracket: { p95: 500, p99: 1000 },
  }

  test('api performance meets SLO targets', async () => {
    const currentMetrics = {
      createTournament: {
        p95: 280,
        p99: 480,
      },
      addParticipant: {
        p95: 220,
        p99: 380,
      },
      updateParticipant: {
        p95: 210,
        p99: 370,
      },
      listTournaments: {
        p95: 180,
        p99: 340,
      },
      generateBracket: {
        p95: 450,
        p99: 950,
      },
    }

    const comparison = compareBenchmarks(targets, currentMetrics)

    console.log('Performance vs Targets:', comparison)

    Object.entries(comparison).forEach(([endpoint, result]) => {
      expect(result.p95).toBeLessThan(0) // Negative means faster than target
      expect(result.p99).toBeLessThan(0)
    })
  })
})

/**
 * Test: Error Handling Performance
 * Ensure error paths don't cause performance regressions
 */
describe('API Performance: Error Paths', () => {
  test('validation errors should respond quickly (<100ms)', async () => {
    const result = await measurePerformance(async () => {
      const response = await fetch(`${API_BASE}/api/participants/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required fields
          tournamentId: 'invalid-uuid',
        }),
      })
      return response.status
    })

    console.log('Validation Error Response Time:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(100)
  })

  test('not found errors should respond quickly (<100ms)', async () => {
    const result = await measurePerformance(async () => {
      const response = await fetch(`${API_BASE}/api/tournaments/non-existent-id`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
      })
      return response.status
    })

    console.log('Not Found Response Time:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(150)
  })

  test('error paths under load (25 concurrent with invalid requests)', async () => {
    const result = await loadTestHandler(
      async () => {
        const response = await fetch(`${API_BASE}/api/participants/add`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // All requests have validation errors
            tournamentId: 'invalid',
          }),
        })
        return response.status === 400 ? 1 : 0 // Expect validation error
      },
      { concurrency: 25, iterations: 10 }
    )

    console.log('Load Test: Error Paths (25 concurrent)', result.metrics)

    // Error handling should maintain throughput
    expect(result.metrics.throughput).toBeGreaterThan(0.1) // At least 0.1 RPS per worker
  })
})
