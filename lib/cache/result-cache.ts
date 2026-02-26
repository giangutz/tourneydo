/**
 * Result Caching Layer for TourneyDo
 *
 * Reduces database query load by caching frequently accessed data.
 *
 * ⚠️  SERVERLESS LIMITATION
 * This cache is stored in Node.js module-level memory (process heap).
 * Each Vercel serverless function invocation may spin up a NEW cold instance,
 * meaning the cache is NOT shared across concurrent requests and is wiped on
 * every cold start. In practice this means:
 *   - Cache hit rates on Vercel will be much lower than local dev.
 *   - Data is never stale across instances, but the cache provides little
 *     benefit for traffic spikes that spawn many fresh instances in parallel.
 *   - Singleton pattern (`getInstance()`) only guarantees one instance per
 *     process, not across the fleet.
 *
 * Future improvement: replace with Vercel KV (Redis) for a shared,
 * persistent cache that works correctly in a serverless environment.
 * See: https://vercel.com/docs/storage/vercel-kv
 *
 * Features:
 * - Automatic TTL invalidation
 * - Manual invalidation on writes
 * - Metrics tracking (hit rate, memory usage)
 * - Per-query configurable TTL (default: 60 s to minimise stale-data window)
 * - Development logging
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  hits: number
}

interface CacheMetrics {
  totalHits: number
  totalMisses: number
  hitRate: number
  entries: number
  memoryUsed: number
}

export class ResultCache {
  private static instance: ResultCache
  private cache: Map<string, CacheEntry<any>> = new Map()
  private metrics = {
    hits: 0,
    misses: 0,
  }

  private constructor() {}

  public static getInstance(): ResultCache {
    if (!ResultCache.instance) {
      ResultCache.instance = new ResultCache()
    }
    return ResultCache.instance
  }

  /**
   * Get cached value or execute fetch function
   * @param key - Cache key
   * @param fetchFn - Function to execute if cache miss
   * @param ttl - Time to live in milliseconds (default: 5 minutes)
   */
  public async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 60 * 1000  // 60 s default — keeps stale-data window short on serverless
  ): Promise<T> {
    const entry = this.cache.get(key)

    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      this.metrics.hits++
      entry.hits++

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Cache] HIT: ${key} (${entry.hits} hits, TTL: ${Math.round((entry.ttl - (Date.now() - entry.timestamp)) / 1000)}s remaining)`
        )
      }

      return entry.data
    }

    this.metrics.misses++

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Cache] MISS: ${key} - fetching...`)
    }

    try {
      const data = await fetchFn()
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
        hits: 0,
      })
      return data
    } catch (error) {
      // On error, return stale cache if available
      if (entry) {
        console.warn(`[Cache] Fetch failed for ${key}, returning stale cache`)
        return entry.data
      }
      throw error
    }
  }

  /**
   * Set cache value directly (useful for write operations)
   */
  public set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || 5 * 60 * 1000,
      hits: 0,
    })

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Cache] SET: ${key}`)
    }
  }

  /**
   * Invalidate a single cache entry
   */
  public invalidate(key: string): void {
    this.cache.delete(key)

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Cache] INVALIDATED: ${key}`)
    }
  }

  /**
   * Invalidate multiple entries by pattern
   * @param pattern - Regex pattern or string prefix
   */
  public invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(`^${pattern}`) : pattern
    let count = 0

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        count++
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Cache] INVALIDATED ${count} entries matching ${pattern}`)
    }
  }

  /**
   * Clear all cache
   */
  public clear(): void {
    const size = this.cache.size
    this.cache.clear()

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Cache] CLEARED all ${size} entries`)
    }
  }

  /**
   * Get cache metrics
   */
  public getMetrics(): CacheMetrics {
    const total = this.metrics.hits + this.metrics.misses
    return {
      totalHits: this.metrics.hits,
      totalMisses: this.metrics.misses,
      hitRate: total === 0 ? 0 : (this.metrics.hits / total) * 100,
      entries: this.cache.size,
      memoryUsed: this.estimateMemoryUsage(),
    }
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = { hits: 0, misses: 0 }
  }

  /**
   * Print metrics to console
   */
  public printMetrics(): void {
    const metrics = this.getMetrics()
    console.log('=== Cache Metrics ===')
    console.log(
      `Hit Rate: ${metrics.hitRate.toFixed(1)}% (${metrics.totalHits} hits, ${metrics.totalMisses} misses)`
    )
    console.log(`Entries: ${metrics.entries}`)
    console.log(`Memory: ~${(metrics.memoryUsed / 1024).toFixed(2)} KB`)
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let bytes = 0
    for (const entry of this.cache.values()) {
      bytes += JSON.stringify(entry.data).length
    }
    return bytes
  }
}

export const resultCache = ResultCache.getInstance()

/**
 * Example usage in database queries
 */
export async function getTournamentCached(
  supabase: any,
  tournamentId: string
): Promise<any> {
  return resultCache.get(
    `tournament:${tournamentId}`,
    async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single()

      if (error) throw new Error(error.message)
      return data
    },
    5 * 60 * 1000 // 5 minute TTL
  )
}

export async function getTournamentDivisionsCached(
  supabase: any,
  tournamentId: string
): Promise<any[]> {
  return resultCache.get(
    `tournament_divisions:${tournamentId}`,
    async () => {
      const { data, error } = await supabase
        .from('tournament_divisions')
        .select('*')
        .eq('tournament_id', tournamentId)

      if (error) throw new Error(error.message)
      return data
    },
    5 * 60 * 1000 // 5 minute TTL
  )
}

export async function getRegistrationsCached(
  supabase: any,
  tournamentId: string
): Promise<any[]> {
  return resultCache.get(
    `registrations:${tournamentId}`,
    async () => {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('tournament_id', tournamentId)

      if (error) throw new Error(error.message)
      return data
    },
    3 * 60 * 1000 // 3 minute TTL (more frequent changes)
  )
}

/**
 * Cache invalidation helpers - call after writes
 */
export function invalidateTournamentCache(tournamentId: string): void {
  resultCache.invalidate(`tournament:${tournamentId}`)
  resultCache.invalidate(`tournament_divisions:${tournamentId}`)
  resultCache.invalidate(`registrations:${tournamentId}`)
}

export function invalidateMatchesCache(tournamentId: string): void {
  resultCache.invalidate(`matches-readiness:${tournamentId}`)
}

export function invalidateAllTournamentCaches(): void {
  resultCache.invalidatePattern('^tournament:')
  resultCache.invalidatePattern('^tournament_divisions:')
  resultCache.invalidatePattern('^registrations:')
  resultCache.invalidatePattern('^matches-readiness:')
}
