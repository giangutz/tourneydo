/**
 * API Performance Tests
 * 
 * Tests individual API endpoints for performance characteristics
 * Measures response times, throughput, and resource usage
 */

import { performance } from 'perf_hooks'
import { NextRequest } from 'next/server'

export interface PerformanceMetrics {
  name: string
  duration: number
  memoryBefore: number
  memoryAfter: number
  memoryDelta: number
  success: boolean
  error?: string
}

export interface LoadTestOptions {
  iterations: number
  concurrency: number
  timeout: number
  warmupIterations: number
}

/**
 * Measure function performance
 */
export async function measurePerformance(
  name: string,
  fn: () => Promise<any>,
  options: Partial<LoadTestOptions> = {}
): Promise<PerformanceMetrics> {
  const {
    timeout = 5000,
  } = options

  const memoryBefore = process.memoryUsage().heapUsed
  const startTime = performance.now()

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )

    await Promise.race([fn(), timeoutPromise])

    const endTime = performance.now()
    const memoryAfter = process.memoryUsage().heapUsed

    return {
      name,
      duration: endTime - startTime,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
      success: true,
    }
  } catch (error) {
    const endTime = performance.now()
    const memoryAfter = process.memoryUsage().heapUsed

    return {
      name,
      duration: endTime - startTime,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Run load test against a handler
 */
export async function loadTestHandler(
  handler: (request: Request) => Promise<Response>,
  requests: Request[],
  options: Partial<LoadTestOptions> = {}
): Promise<{
  totalRequests: number
  successCount: number
  failureCount: number
  totalDuration: number
  avgDuration: number
  minDuration: number
  maxDuration: number
  p95Duration: number
  p99Duration: number
  throughput: number
}> {
  const { concurrency = 1, warmupIterations = 0 } = options

  // Warmup phase
  for (let i = 0; i < warmupIterations && i < requests.length; i++) {
    try {
      await handler(requests[i])
    } catch (error) {
      // Ignore warmup errors
    }
  }

  const durations: number[] = []
  let successCount = 0
  let failureCount = 0
  const startTime = performance.now()

  // Run requests in batches to respect concurrency
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency)

    const batchResults = await Promise.all(
      batch.map(async (request) => {
        const reqStart = performance.now()
        try {
          const response = await handler(request)
          const reqEnd = performance.now()
          const duration = reqEnd - reqStart

          durations.push(duration)
          if (response.status >= 200 && response.status < 300) {
            successCount++
          } else {
            failureCount++
          }
        } catch (error) {
          const reqEnd = performance.now()
          durations.push(reqEnd - reqStart)
          failureCount++
        }
      })
    )
  }

  const endTime = performance.now()
  const totalDuration = endTime - startTime
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length

  // Calculate percentiles
  durations.sort((a, b) => a - b)
  const p95Index = Math.floor(durations.length * 0.95)
  const p99Index = Math.floor(durations.length * 0.99)

  return {
    totalRequests: requests.length,
    successCount,
    failureCount,
    totalDuration,
    avgDuration,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
    p95Duration: durations[p95Index] || 0,
    p99Duration: durations[p99Index] || 0,
    throughput: (requests.length / totalDuration) * 1000, // requests per second
  }
}

/**
 * Format metrics for display
 */
export function formatMetrics(metrics: PerformanceMetrics): string {
  return `
${metrics.name}:
  Duration: ${metrics.duration.toFixed(2)}ms
  Memory Before: ${(metrics.memoryBefore / 1024 / 1024).toFixed(2)}MB
  Memory After: ${(metrics.memoryAfter / 1024 / 1024).toFixed(2)}MB
  Memory Delta: ${(metrics.memoryDelta / 1024).toFixed(2)}KB
  Status: ${metrics.success ? '✓ Success' : `✗ Failed: ${metrics.error}`}
  `
}

/**
 * Format load test results
 */
export function formatLoadTestResults(results: any): string {
  return `
Load Test Results:
  Total Requests: ${results.totalRequests}
  Successful: ${results.successCount} (${((results.successCount / results.totalRequests) * 100).toFixed(2)}%)
  Failed: ${results.failureCount} (${((results.failureCount / results.totalRequests) * 100).toFixed(2)}%)
  Total Duration: ${results.totalDuration.toFixed(2)}ms
  Average Response Time: ${results.avgDuration.toFixed(2)}ms
  Min Response Time: ${results.minDuration.toFixed(2)}ms
  Max Response Time: ${results.maxDuration.toFixed(2)}ms
  P95 Response Time: ${results.p95Duration.toFixed(2)}ms
  P99 Response Time: ${results.p99Duration.toFixed(2)}ms
  Throughput: ${results.throughput.toFixed(2)} req/s
  `
}

/**
 * Generate concurrent requests for load testing
 */
export function generateRequests(
  url: string,
  method: string = 'GET',
  body?: any,
  count: number = 100,
  headers: Record<string, string> = {}
): Request[] {
  return Array.from({ length: count }, (_, i) => {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }

    if (body) {
      if (typeof body === 'function') {
        options.body = JSON.stringify(body(i))
      } else {
        options.body = JSON.stringify(body)
      }
    }

    return new Request(url, options)
  })
}

/**
 * Simulate database query performance
 */
export interface QueryMetrics {
  query: string
  duration: number
  rowsAffected: number
  executionPlan: string
}

export async function measureDatabaseQuery(
  query: string,
  fn: () => Promise<any>
): Promise<QueryMetrics> {
  const startTime = performance.now()
  const result = await fn()
  const endTime = performance.now()

  return {
    query,
    duration: endTime - startTime,
    rowsAffected: result?.rowCount || 0,
    executionPlan: result?.plan || '',
  }
}

/**
 * Profile CPU and memory usage
 */
export async function profileResource(
  name: string,
  fn: () => Promise<void>,
  sampleInterval: number = 100
): Promise<{
  name: string
  avgCpuUsage: number
  peakMemory: number
  averageMemory: number
}> {
  const samples: number[] = []
  const memorySamples: number[] = []
  let maxMemory = 0

  const startMeasure = performance.now()

  const interval = setInterval(() => {
    const usage = process.cpuUsage()
    const memory = process.memoryUsage()

    samples.push((usage.user + usage.system) / 1000000) // Convert to seconds
    memorySamples.push(memory.heapUsed)
    maxMemory = Math.max(maxMemory, memory.heapUsed)
  }, sampleInterval)

  try {
    await fn()
  } finally {
    clearInterval(interval)
  }

  const avgCpu = samples.reduce((a, b) => a + b, 0) / samples.length
  const avgMemory = memorySamples.reduce((a, b) => a + b, 0) / memorySamples.length

  return {
    name,
    avgCpuUsage: avgCpu,
    peakMemory: maxMemory,
    averageMemory: avgMemory,
  }
}

/**
 * Benchmark comparison
 */
export function compareBenchmarks(
  baseline: PerformanceMetrics,
  current: PerformanceMetrics
): {
  durationChange: number
  durationChangePercent: number
  memoryChange: number
  memoryChangePercent: number
} {
  return {
    durationChange: current.duration - baseline.duration,
    durationChangePercent: ((current.duration - baseline.duration) / baseline.duration) * 100,
    memoryChange: current.memoryDelta - baseline.memoryDelta,
    memoryChangePercent: ((current.memoryDelta - baseline.memoryDelta) / baseline.memoryDelta) * 100,
  }
}
