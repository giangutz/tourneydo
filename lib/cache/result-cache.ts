import { logger } from '@/lib/logger'

/**
 * Result Cache — pass-through implementation.
 *
 * The original in-process Map cache was ineffective on Vercel serverless:
 * each cold-start instance had its own isolated Map, so invalidations from
 * one instance never reached another, and hit rates were near zero.
 *
 * All callers are preserved so no import changes are needed. The `get()`
 * method now calls fetchFn() directly. Invalidation helpers are no-ops.
 *
 * Stable, infrequently-changing data (tournament setup) uses Next.js
 * `unstable_cache` + `revalidateTag` in the query layer — see
 * lib/db/queries/tournaments.ts. Live match data goes direct to Supabase.
 */

export const resultCache = {
  async get<T>(_key: string, fetchFn: () => Promise<T>): Promise<T> {
    return fetchFn()
  },
  set<T>(_key: string, _data: T): void {},
  invalidate(_key: string): void {},
  invalidatePattern(_pattern: string | RegExp): void {},
  clear(): void {},
  getMetrics() {
    return { totalHits: 0, totalMisses: 0, hitRate: 0, entries: 0, memoryUsed: 0 }
  },
}

export function invalidateTournamentCache(_tournamentId: string): void {}
export function invalidateMatchesCache(_tournamentId: string): void {}
export function invalidateAllTournamentCaches(): void {}

export async function getTournamentCached(supabase: any, tournamentId: string): Promise<any> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getTournamentDivisionsCached(supabase: any, tournamentId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('tournament_divisions')
    .select('*')
    .eq('tournament_id', tournamentId)
  if (error) throw new Error(error.message)
  return data
}

export async function getRegistrationsCached(supabase: any, tournamentId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('tournament_id', tournamentId)
  if (error) throw new Error(error.message)
  return data
}

export function logCacheMetrics(): void {
  logger.info({ cache: 'pass-through (no in-process cache)' }, 'Cache metrics')
}
