/**
 * K6 Load Test Script for TourneyDo
 * 
 * Tests API performance under load with realistic tournament scenarios
 * Run with: k6 run scripts/performance/load-test.k6.js
 * 
 * Stages:
 * 1. Ramp-up: 0-50 VUs over 30s
 * 2. Spike: 50-100 VUs over 10s
 * 3. Sustained: 100 VUs for 60s
 * 4. Ramp-down: 100-0 VUs over 30s
 */

import http from 'k6/http'
import { check, group, sleep } from 'k6'
import { Rate, Trend, Counter, Gauge } from 'k6/metrics'

// Custom metrics
const apiErrorRate = new Rate('api_errors')
const apiDuration = new Trend('api_duration')
const apiSuccessRate = new Rate('api_success')
const activeVUs = new Gauge('active_vus')
const requestsPerSecond = new Counter('requests')

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const API_TOKEN = __ENV.API_TOKEN || 'test-token'

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp-up to 50 VUs
    { duration: '10s', target: 100 },  // Spike to 100 VUs
    { duration: '60s', target: 100 },  // Sustained 100 VUs
    { duration: '30s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],  // 95% < 500ms, 99% < 1s
    'http_req_failed': ['rate<0.1'],                    // <10% error rate
    'api_errors': ['rate<0.1'],                         // <10% API errors
  },
  ext: {
    loadimpact: {
      projectID: 3176484,
      name: 'TourneyDo Load Test'
    }
  }
}

export default function () {
  activeVUs.set(__VU)
  requestsPerSecond.add(1)

  // Simulate tournament organizer workflow
  group('Tournament Creation Flow', () => {
    let response = http.post(`${BASE_URL}/api/tournaments`, JSON.stringify({
      name: `Tournament ${__VU}-${__ITER}`,
      description: 'Load test tournament',
      tournament_type: 'elimination',
      tournament_date: new Date().toISOString().split('T')[0],
      location: 'Test Venue',
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    })

    check(response, {
      'tournament create status 201': (r) => r.status === 201 || r.status === 200,
      'tournament create has ID': (r) => r.body.includes('id'),
    })

    apiErrorRate.add(response.status >= 400)
    apiSuccessRate.add(response.status < 400)
    apiDuration.add(response.timings.duration)

    sleep(1)
  })

  // Simulate participant registration
  group('Participant Registration', () => {
    let response = http.post(`${BASE_URL}/api/participants/add`, JSON.stringify({
      tournamentId: '550e8400-e29b-41d4-a716-446655440000',
      teamId: '550e8400-e29b-41d4-a716-446655440001',
      firstName: `Participant${__VU}`,
      lastName: 'LoadTest',
      beltLevel: 'Blue',
      dob: '1990-01-01',
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    })

    check(response, {
      'participant add status 2xx': (r) => r.status >= 200 && r.status < 300,
      'participant has success': (r) => r.body.includes('success'),
    })

    apiErrorRate.add(response.status >= 400)
    apiSuccessRate.add(response.status < 400)
    apiDuration.add(response.timings.duration)

    sleep(1)
  })

  // Simulate tournament list browsing
  group('Tournament List Browsing', () => {
    let response = http.get(`${BASE_URL}/api/tournaments?page=1&limit=20`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    })

    check(response, {
      'tournament list status 2xx': (r) => r.status >= 200 && r.status < 300,
      'tournament list has data': (r) => r.body.length > 0,
    })

    apiErrorRate.add(response.status >= 400)
    apiSuccessRate.add(response.status < 400)
    apiDuration.add(response.timings.duration)

    sleep(2)
  })

  // Simulate match updates
  group('Match Updates', () => {
    let response = http.put(`${BASE_URL}/api/matches/550e8400-e29b-41d4-a716-446655440000`, JSON.stringify({
      status: 'completed',
      winner_id: 'player-1',
      score: {
        player1: 8,
        player2: 5,
      },
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    })

    check(response, {
      'match update status 2xx': (r) => r.status >= 200 && r.status < 300,
    })

    apiErrorRate.add(response.status >= 400)
    apiSuccessRate.add(response.status < 400)
    apiDuration.add(response.timings.duration)

    sleep(1)
  })

  // Simulate payment tracking
  group('Payment Operations', () => {
    let response = http.post(`${BASE_URL}/api/payments/submit`, JSON.stringify({
      tournament_id: '550e8400-e29b-41d4-a716-446655440000',
      team_id: '550e8400-e29b-41d4-a716-446655440001',
      amount: 150,
      status: 'pending',
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    })

    check(response, {
      'payment submit status 2xx': (r) => r.status >= 200 && r.status < 300,
    })

    apiErrorRate.add(response.status >= 400)
    apiSuccessRate.add(response.status < 400)
    apiDuration.add(response.timings.duration)

    sleep(1)
  })

  sleep(2)
}

export function teardown(data) {
  console.log('Load test completed')
  console.log(`Total requests: ${requestsPerSecond.value}`)
  console.log(`API error rate: ${(apiErrorRate.value * 100).toFixed(2)}%`)
  console.log(`API success rate: ${(apiSuccessRate.value * 100).toFixed(2)}%`)
  console.log(`Average API duration: ${apiDuration.value.toFixed(2)}ms`)
}
