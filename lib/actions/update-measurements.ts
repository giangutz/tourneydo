'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'

export async function updateParticipantMeasurements(
  registrationId: string,
  weight: number,
  height: number,
  tournamentId: string
) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const supabase = createServerSupabaseClient()

  // 1. Get the player_id from registration
  const { data: registration, error: regError } = await supabase
    .from('tournament_registrations')
    .select('player_id')
    .eq('id', registrationId)
    .single()

  if (regError || !registration) {
    throw new Error('Participant not found')
  }

  const playerId = registration.player_id

  // 2. Update the PLAYER profile (as this is what bracket logic checks)
  const { error: playerError } = await supabase
    .from('players')
    .update({ weight, height })
    .eq('id', playerId)

  if (playerError) {
    throw new Error(`Failed to update player: ${playerError.message}`)
  }

  // 3. Optional: update actual_weight/height on registration too if you want to keep them in sync
  await supabase
    .from('tournament_registrations')
    .update({ actual_weight: weight, actual_height: height })
    .eq('id', registrationId)

  revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/bracket`)

  return { success: true }
}
