import { createServerSupabaseClient } from '@/lib/supabase/server'
import { MatchInsert, MatchUpdate, Match } from '@/types/models'
import { createMatchRounds } from './match-rounds'

/**
 * Save a generated bracket (delete existing and insert new)
 */
export async function saveBracket(tournamentId: string, matches: MatchInsert[]): Promise<void> {
  const supabase = createServerSupabaseClient()

  console.log(`saveBracket: Saving ${matches.length} matches for tournament ${tournamentId}`)
  console.log('Matches to save:', matches.map(m => ({
    round: m.round,
    match_number: m.match_number,
    player1_id: m.player1_id,
    player2_id: m.player2_id,
    status: m.status
  })))

  // 1. Clear existing matches
  const { error: deleteError } = await supabase
    .from('matches')
    .delete()
    .eq('tournament_id', tournamentId)

  if (deleteError) {
    throw new Error(`Failed to clear existing bracket: ${deleteError.message}`)
  }

  // 2. Insert new matches
  const { data, error: insertError } = await supabase
    .from('matches')
    .insert(matches)
    .select()

  if (insertError) {
    console.error('Insert error:', insertError)
    throw new Error(`Failed to save bracket: ${insertError.message}`)
  }

  console.log(`Successfully inserted ${data?.length || 0} matches`)

  // 3. Create 3 rounds for each match
  if (data) {
    console.log('Creating rounds for each match...')
    for (const match of data) {
      try {
        await createMatchRounds(match.id)
      } catch (error) {
        console.error(`Failed to create rounds for match ${match.id}:`, error)
      }
    }
    console.log('Rounds created successfully')
  }
}

/**
 * Update a match
 */
export async function updateMatch(id: string, updates: MatchUpdate): Promise<Match> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('matches')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update match: ${error.message}`)
  }

  return data
}

/**
 * Advance a winner to the next match
 */
export async function advanceWinner(matchId: string, updates: Partial<Match>): Promise<void> {
  const supabase = createServerSupabaseClient()

  const { error } = await supabase
    .from('matches')
    .update(updates)
    .eq('id', matchId)

  if (error) {
    throw new Error(`Failed to advance winner: ${error.message}`)
  }
}

/**
 * Get all matches for a tournament
 */
export async function getTournamentMatches(tournamentId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      tournament_divisions (
        id,
        name,
        min_age,
        max_age
      ),
      tournament_categories (
        id,
        name,
        gender
      )
    `)
    .eq('tournament_id', tournamentId)
    .order('round', { ascending: true })
    .order('match_number', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch matches: ${error.message}`)
  }

  return data || []
}
