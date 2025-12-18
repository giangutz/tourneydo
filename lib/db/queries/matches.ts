import { createServerSupabaseClient } from '@/lib/supabase/server'
import { MatchInsert, MatchUpdate, Match } from '@/types/models'


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

  // 3. Create 3 rounds for each match (Batch Insert)
  if (data && data.length > 0) {
    console.log('Creating rounds for matches...')

    const allRounds = data.flatMap(match => [
      { match_id: match.id, round_number: 1 },
      { match_id: match.id, round_number: 2 },
      { match_id: match.id, round_number: 3 }
    ])

    // Batch insert in chunks of 1000 to be safe
    const CHUNK_SIZE = 1000
    for (let i = 0; i < allRounds.length; i += CHUNK_SIZE) {
      const chunk = allRounds.slice(i, i + CHUNK_SIZE)
      const { error: roundsError } = await supabase
        .from('match_rounds')
        .insert(chunk)

      if (roundsError) {
        console.error('Failed to insert batch of rounds:', roundsError)
        // We log but maybe don't throw to not kill the whole process if partial success? 
        // Actually, if rounds fail, the match is broken. We should probably throw.
        throw new Error(`Failed to create rounds: ${roundsError.message}`)
      }
    }

    console.log(`Successfully created ${allRounds.length} rounds`)
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
      ),
      player1:players!player1_id (
        id,
        first_name,
        last_name,
        belt_level
      ),
      player2:players!player2_id (
        id,
        first_name,
        last_name,
        belt_level
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
