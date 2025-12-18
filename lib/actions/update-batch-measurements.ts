'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'

export type ParticipantUpdate = {
  id: string // registration id
  weight?: number
  height?: number
}

export async function updateBatchParticipantMeasurements(
  updates: ParticipantUpdate[],
  tournamentId: string
) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const supabase = createServerSupabaseClient()

  // We'll process updates in parallel requests for now as Supabase doesn't have a simple "bulk update different values" method without a stored procedure or complex query construction.
  // Given the scale is likely small (10-20 errors max usually), Promise.all is acceptable.

  const updatePromises = updates.map(async (update) => {
    // 1. Get player_id
    const { data: registration } = await supabase
      .from('tournament_registrations')
      .select('player_id')
      .eq('id', update.id)
      .single()

    if (!registration) return { success: false, id: update.id, error: 'Not found' }

    // 2. Update Player
    const updateData: any = {}
    if (update.weight !== undefined) updateData.weight = update.weight
    if (update.height !== undefined) updateData.height = update.height

    const { error } = await supabase
      .from('players')
      .update(updateData)
      .eq('id', registration.player_id)

    // 3. Update Registration cache
    const regUpdateData: any = {}
    if (update.weight !== undefined) regUpdateData.actual_weight = update.weight
    if (update.height !== undefined) regUpdateData.actual_height = update.height

    await supabase.from('tournament_registrations').update(regUpdateData).eq('id', update.id)

    return { success: !error, id: update.id, error: error?.message }
  })

  const results = await Promise.all(updatePromises)
  const failures = results.filter(r => !r.success)

  if (failures.length > 0) {
    throw new Error(`Failed to update ${failures.length} participants`)
  }

  revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/bracket`)

  return { success: true }
}
