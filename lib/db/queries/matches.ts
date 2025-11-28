import { createServerSupabaseClient } from '@/lib/supabase/server'
import { MatchInsert, MatchUpdate, Match } from '@/types/models'

/**
 * Save a generated bracket (delete existing and insert new)
 */
export async function saveBracket(tournamentId: string, matches: MatchInsert[]): Promise<void> {
  const supabase = createServerSupabaseClient()

  // 1. Clear existing matches
  const { error: deleteError } = await supabase
    .from('matches')
    .delete()
    .eq('tournament_id', tournamentId)

  if (deleteError) {
    throw new Error(`Failed to clear existing bracket: ${deleteError.message}`)
  }

  // 2. Insert new matches
  const { error: insertError } = await supabase
    .from('matches')
    .insert(matches)

  if (insertError) {
    throw new Error(`Failed to save bracket: ${insertError.message}`)
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
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round', { ascending: true })
    .order('match_number', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch matches: ${error.message}`)
  }

  return data || []
}
