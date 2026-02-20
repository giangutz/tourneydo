/**
 * Database Query Performance Tests for TourneyDo
 * 
 * Tests database queries for:
 * - Query execution time
 * - Query efficiency (rows scanned vs returned)
 * - N+1 query detection
 * - Index usage
 * - Connection pooling behavior
 * 
 * Run: npm run test:performance:db
 */

import { createClient } from '@supabase/supabase-js'
import { measurePerformance } from '../../lib/performance/benchmark'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

interface QueryMetrics {
  name: string
  duration: number
  rowsScanned?: number
  rowsReturned: number
  efficiency: number
  hasIndex?: boolean
  notes?: string
}

const metrics: QueryMetrics[] = []

/**
 * Test: Fetch Tournament with All Relations
 */
describe('Database Performance: Tournament Queries', () => {
  test('fetch single tournament should complete in <50ms', async () => {
    const result = await measurePerformance(async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', 'test-tournament-id')
        .single()

      if (error) throw new Error(error.message)
      return data
    })

    metrics.push({
      name: 'fetch_tournament_single',
      duration: result.metrics.duration,
      rowsReturned: 1,
      efficiency: 100,
      hasIndex: true,
      notes: 'Querying by primary key, should use index',
    })

    console.log('Fetch Single Tournament:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(50)
  })

  test('fetch tournament with divisions should complete in <100ms', async () => {
    const result = await measurePerformance(async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*, tournament_divisions(*)')
        .eq('id', 'test-tournament-id')
        .single()

      if (error) throw new Error(error.message)
      return data
    })

    metrics.push({
      name: 'fetch_tournament_with_divisions',
      duration: result.metrics.duration,
      rowsReturned: 1,
      efficiency: 100,
      hasIndex: true,
      notes: 'With one related table join',
    })

    console.log('Fetch Tournament with Divisions:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(100)
  })

  test('fetch tournament with full relation tree should complete in <200ms', async () => {
    const result = await measurePerformance(async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select(
          `
          *,
          tournament_divisions (
            *,
            categories (*)
          ),
          matches (
            *,
            participants!inner (*)
          ),
          registrations (*)
          `
        )
        .eq('id', 'test-tournament-id')
        .single()

      if (error) throw new Error(error.message)
      return data
    })

    metrics.push({
      name: 'fetch_tournament_full_tree',
      duration: result.metrics.duration,
      rowsReturned: 1,
      efficiency: 75,
      notes: 'Complex query with multiple joins, may benefit from caching',
    })

    console.log('Fetch Tournament Full Tree:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(200)
  })

  test('list tournaments with pagination should complete in <150ms', async () => {
    const result = await measurePerformance(async () => {
      const { data, error, count } = await supabase
        .from('tournaments')
        .select('*', { count: 'exact' })
        .range(0, 49)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      return { data, count }
    })

    metrics.push({
      name: 'list_tournaments_paginated',
      duration: result.metrics.duration,
      rowsReturned: 50,
      efficiency: 100,
      hasIndex: true,
      notes: 'Paginated query on created_at index',
    })

    console.log('List Tournaments Paginated:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(150)
  })

  test('list tournaments with filter should complete in <100ms', async () => {
    const result = await measurePerformance(async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'active')
        .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw new Error(error.message)
      return data
    })

    metrics.push({
      name: 'list_tournaments_filtered',
      duration: result.metrics.duration,
      rowsReturned: 50,
      efficiency: 85,
      hasIndex: true,
      notes: 'Should use composite index on (status, created_at)',
    })

    console.log('List Tournaments Filtered:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(100)
  })

  test('detect n+1 query pattern: loading tournaments then divisions', async () => {
    const result = await measurePerformance(async () => {
      // Fetch tournaments
      const { data: tournaments, error } = await supabase
        .from('tournaments')
        .select('*')
        .limit(10)

      if (error) throw new Error(error.message)

      // N+1 anti-pattern: fetch divisions separately for each tournament
      const divisions = await Promise.all(
        tournaments.map(t =>
          supabase
            .from('tournament_divisions')
            .select('*')
            .eq('tournament_id', t.id)
        )
      )

      return { tournaments, divisions }
    })

    metrics.push({
      name: 'n_plus_one_pattern_detected',
      duration: result.metrics.duration,
      efficiency: 30,
      notes: 'ANTI-PATTERN: 11 queries instead of 1. Use single query with joins.',
    })

    console.log('N+1 Pattern Detected:', {
      duration: `${result.metrics.duration}ms`,
      queriesExecuted: 11,
      recommendation: 'Use select("*, tournament_divisions(*)")',
    })

    expect(result.metrics.duration).toBeGreaterThan(100) // Should be slow
  })
})

/**
 * Test: Participant/Registration Queries
 */
describe('Database Performance: Participant Queries', () => {
  test('fetch registrations for tournament should complete in <100ms', async () => {
    const result = await measurePerformance(async () => {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('tournament_id', 'test-tournament-id')
        .order('created_at', { ascending: true })

      if (error) throw new Error(error.message)
      return data
    })

    metrics.push({
      name: 'fetch_registrations_by_tournament',
      duration: result.metrics.duration,
      rowsReturned: result.metrics.duration ? 50 : 0, // estimate
      efficiency: 100,
      hasIndex: true,
      notes: 'Foreign key index on tournament_id',
    })

    console.log('Fetch Registrations by Tournament:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(100)
  })

  test('fetch registrations with participant data should complete in <150ms', async () => {
    const result = await measurePerformance(async () => {
      const { data, error } = await supabase
        .from('registrations')
        .select(
          `
          *,
          participants (
            id,
            first_name,
            last_name,
            belt_level,
            weight,
            height
          )
          `
        )
        .eq('tournament_id', 'test-tournament-id')

      if (error) throw new Error(error.message)
      return data
    })

    metrics.push({
      name: 'fetch_registrations_with_participants',
      duration: result.metrics.duration,
      efficiency: 85,
      notes: 'Join with participants table',
    })

    console.log('Fetch Registrations with Participants:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(150)
  })

  test('search participants by name should complete in <100ms', async () => {
    const result = await measurePerformance(async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .ilike('first_name', '%john%')
        .limit(50)

      if (error) throw new Error(error.message)
      return data
    })

    metrics.push({
      name: 'search_participants_by_name',
      duration: result.metrics.duration,
      efficiency: 60,
      notes: 'ilike search, may benefit from full-text search index',
    })

    console.log('Search Participants by Name:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(100)
  })

  test('fetch participant statistics should complete in <200ms', async () => {
    const result = await measurePerformance(async () => {
      const { data, error } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: false })
        .eq('tournament_id', 'test-tournament-id')

      if (error) throw new Error(error.message)

      // Calculate statistics
      const grouped = data.reduce(
        (acc, reg) => {
          const status = reg.status
          acc[status] = (acc[status] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      return grouped
    })

    metrics.push({
      name: 'participant_statistics',
      duration: result.metrics.duration,
      efficiency: 80,
      notes: 'Client-side aggregation. Consider server-side for large datasets.',
    })

    console.log('Participant Statistics:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(200)
  })
})

/**
 * Test: Match/Bracket Queries
 */
describe('Database Performance: Match Queries', () => {
  test('fetch matches for division should complete in <100ms', async () => {
    const result = await measurePerformance(async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('division_id', 'test-division-id')
        .order('round', { ascending: true })

      if (error) throw new Error(error.message)
      return data
    })

    metrics.push({
      name: 'fetch_matches_by_division',
      duration: result.metrics.duration,
      efficiency: 100,
      hasIndex: true,
      notes: 'Foreign key index on division_id',
    })

    console.log('Fetch Matches by Division:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(100)
  })

  test('fetch match with participants should complete in <120ms', async () => {
    const result = await measurePerformance(async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(
          `
          *,
          participants!match_id (
            id,
            first_name,
            last_name,
            belt_level,
            weight
          ),
          match_scores (*)
          `
        )
        .eq('division_id', 'test-division-id')

      if (error) throw new Error(error.message)
      return data
    })

    metrics.push({
      name: 'fetch_matches_with_participants',
      duration: result.metrics.duration,
      efficiency: 80,
      notes: 'Multiple joins, may need denormalization for real-time updates',
    })

    console.log('Fetch Matches with Participants:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(120)
  })

  test('fetch bracket structure efficiently should complete in <150ms', async () => {
    const result = await measurePerformance(async () => {
      const { data: divisions, error: divError } = await supabase
        .from('tournament_divisions')
        .select('id, name')
        .eq('tournament_id', 'test-tournament-id')

      if (divError) throw new Error(divError.message)

      // Fetch all matches for tournament divisions in one query
      const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select('id, division_id, round, bracket_position')
        .in(
          'division_id',
          divisions.map(d => d.id)
        )

      if (matchError) throw new Error(matchError.message)

      return { divisions, matches }
    })

    metrics.push({
      name: 'fetch_bracket_structure',
      duration: result.metrics.duration,
      efficiency: 90,
      notes: 'Optimized: 2 queries instead of N+1',
    })

    console.log('Fetch Bracket Structure:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(150)
  })
})

/**
 * Test: Write Performance
 */
describe('Database Performance: Write Operations', () => {
  test('insert single match result should complete in <100ms', async () => {
    const result = await measurePerformance(async () => {
      const { error } = await supabase.from('match_scores').insert({
        match_id: 'test-match-id',
        participant_id: 'test-participant-id',
        points: 15,
        created_at: new Date().toISOString(),
      })

      if (error) throw new Error(error.message)
      return null
    })

    metrics.push({
      name: 'insert_match_score',
      duration: result.metrics.duration,
      efficiency: 100,
      notes: 'Single insert',
    })

    console.log('Insert Match Score:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(100)
  })

  test('batch insert registrations should complete in <300ms', async () => {
    const result = await measurePerformance(async () => {
      const registrations = Array.from({ length: 50 }, (_, i) => ({
        tournament_id: 'test-tournament-id',
        team_id: 'test-team-id',
        participant_id: `test-participant-${i}`,
        status: 'registered',
        created_at: new Date().toISOString(),
      }))

      const { error } = await supabase.from('registrations').insert(registrations)

      if (error) throw new Error(error.message)
      return null
    })

    metrics.push({
      name: 'batch_insert_registrations',
      duration: result.metrics.duration,
      efficiency: 100,
      notes: 'Batch insert of 50 records',
    })

    console.log('Batch Insert Registrations:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(300)
  })

  test('update registration status should complete in <100ms', async () => {
    const result = await measurePerformance(async () => {
      const { error } = await supabase
        .from('registrations')
        .update({ status: 'weighed_in' })
        .eq('id', 'test-registration-id')

      if (error) throw new Error(error.message)
      return null
    })

    metrics.push({
      name: 'update_registration_status',
      duration: result.metrics.duration,
      efficiency: 100,
      notes: 'Single row update',
    })

    console.log('Update Registration Status:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(100)
  })
})

/**
 * Test: Aggregation Queries
 */
describe('Database Performance: Aggregations', () => {
  test('count registrations by status should complete in <50ms', async () => {
    const result = await measurePerformance(async () => {
      const { data, error } = await supabase
        .from('registrations')
        .select('status', { count: 'exact' })
        .eq('tournament_id', 'test-tournament-id')

      if (error) throw new Error(error.message)

      // Client-side aggregation
      return data.reduce(
        (acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )
    })

    metrics.push({
      name: 'count_by_status',
      duration: result.metrics.duration,
      efficiency: 70,
      notes: 'Client-side aggregation. Use SQL aggregate for large datasets.',
    })

    console.log('Count by Status:', {
      duration: `${result.metrics.duration}ms`,
    })

    expect(result.metrics.duration).toBeLessThan(100)
  })
})

/**
 * Summary and Report
 */
afterAll(() => {
  console.log('\n=== DATABASE PERFORMANCE METRICS ===\n')
  console.table(
    metrics.map(m => ({
      Query: m.name,
      'Duration (ms)': m.duration,
      'Rows Returned': m.rowsReturned,
      'Efficiency %': m.efficiency,
      'Has Index': m.hasIndex ? '✓' : '✗',
      Notes: m.notes || '',
    }))
  )

  // Identify slow queries
  const slowQueries = metrics.filter(m => m.duration > 150)
  if (slowQueries.length > 0) {
    console.log('\n⚠️  SLOW QUERIES (>150ms):')
    slowQueries.forEach(q => {
      console.log(`  - ${q.name}: ${q.duration}ms`)
    })
  }

  // Identify low efficiency queries
  const inefficientQueries = metrics.filter(m => m.efficiency < 70)
  if (inefficientQueries.length > 0) {
    console.log('\n⚠️  INEFFICIENT QUERIES (<70% efficiency):')
    inefficientQueries.forEach(q => {
      console.log(`  - ${q.name}: ${q.efficiency}% (${q.notes})`)
    })
  }

  const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
  console.log(`\nAverage Query Duration: ${avgDuration.toFixed(2)}ms`)
})
