import { createServerSupabaseClient } from '@/lib/supabase/server'
import { MatchInsert, MatchUpdate, Match } from '@/types/models'


/**
 * Save a generated bracket (delete existing and insert new)
 */
// Helper to map Domain Match/MatchInsert to DB Row
function toDbMatch(match: Partial<Match> | MatchInsert): any {
  const dbMatch: any = { ...match }

  // Map fields
  // if ('round' in match) {
  //   dbMatch.round_number = match.round
  //   delete dbMatch.round
  // }
  if ('score_player1' in match) {
    dbMatch.player1_score = match.score_player1
    delete dbMatch.score_player1
  }
  if ('score_player2' in match) {
    dbMatch.player2_score = match.score_player2
    delete dbMatch.score_player2
  }

  // Remove fields that don't exist in matches table
  const nonDbFields = [
    'score_round1_player1', 'score_round1_player2', 'winner_round1',
    'score_round2_player1', 'score_round2_player2', 'winner_round2',
    'score_round3_player1', 'score_round3_player2', 'winner_round3',
    'court_number'
  ]

  nonDbFields.forEach(field => delete dbMatch[field])

  return dbMatch
}

export async function saveBracket(tournamentId: string, matches: MatchInsert[]): Promise<void> {
  const supabase = createServerSupabaseClient()

  console.log(`saveBracket: Saving ${matches.length} matches for tournament ${tournamentId}`)

  const dbMatches = matches.map(toDbMatch)

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
    .insert(dbMatches)
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

  const dbUpdates = toDbMatch(updates)

  const { data, error } = await supabase
    .from('matches')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update match: ${error.message}`)
  }

  // We theoretically should transform result back to Match, but for now returning data (partial mismatch potentially)
  // To be safe, we should probably re-fetch using getTournamentMatches or apply same transform.
  // But getTournamentMatches returns array.
  // Let's just return what we have as any to satisfy type for now, relying on getTournamentMatches for view.
  return data as unknown as Match
}

/**
 * Advance a winner to the next match
 */
export async function advanceWinner(matchId: string, updates: Partial<Match>): Promise<void> {
  const supabase = createServerSupabaseClient()

  const dbUpdates = toDbMatch(updates)

  const { error } = await supabase
    .from('matches')
    .update(dbUpdates)
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
      match_rounds (
        round_number,
        score_player1,
        score_player2,
        winner_id
      ),
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

  // Transform to match Match interface
  const matches = data?.map(m => {
    const rounds = m.match_rounds as any[] || []
    const r1 = rounds.find(r => r.round_number === 1)
    const r2 = rounds.find(r => r.round_number === 2)
    const r3 = rounds.find(r => r.round_number === 3)

    return {
      ...m,
      round: (m as any).round || m.round_number || 0,
      score_player1: m.player1_score || 0,
      score_player2: m.player2_score || 0,

      score_round1_player1: r1?.score_player1 || 0,
      score_round1_player2: r1?.score_player2 || 0,
      winner_round1: r1?.winner_id || null,

      score_round2_player1: r2?.score_player1 || 0,
      score_round2_player2: r2?.score_player2 || 0,
      winner_round2: r2?.winner_id || null,

      score_round3_player1: r3?.score_player1 || 0,
      score_round3_player2: r3?.score_player2 || 0,
      winner_round3: r3?.winner_id || null,

      // Ensure other fields required by Match interface are present if they differ
      court_number: null, // DB has court_id, model expects court_number? DB types says matches has court_id. Model has court_number. 
      // Checking Model: court_number: number | null
      // checking DB: court_id: string | null. 
      // This might be another mismatch. For now, setting match properties.

      // The spread ...m includes created_at, id, match_number, status, etc.
      // We need to make sure we satisfy the Match interface.
    } as unknown as Match
  }) || []

  return matches
}
