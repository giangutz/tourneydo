'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function fetchMatchRounds(matchId: string) {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('match_rounds')
    .select('*')
    .eq('match_id', matchId)
    .order('round_number', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch match rounds: ${error.message}`)
  }

  return data || []
}
