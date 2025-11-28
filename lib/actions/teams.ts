'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Player } from '@/types/models'

export async function getTeamPlayers(teamId: string): Promise<Player[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('team_players')
    .select(`
      player:players(*)
    `)
    .eq('team_id', teamId)

  if (error) {
    throw new Error(`Failed to fetch team players: ${error.message}`)
  }

  // Flatten the response to return just the player objects
  return data.map((item: any) => item.player) as Player[]
}
