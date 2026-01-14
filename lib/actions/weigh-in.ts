'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getTournamentDivisions } from '@/lib/db/queries/divisions'

export interface WeighInGenerationResult {
  success: boolean
  message: string
  count?: number
}

/**
 * Generate a random weigh-in list for a tournament
 * Selects 20% of participants from each division/category for weigh-in
 */
export async function generateWeighInList(tournamentId: string): Promise<WeighInGenerationResult> {
  const supabase = createServerSupabaseClient()

  // 1. Verify brackets/matches exist (prerequisite)
  const { count: matchCount, error: matchError } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)

  if (matchError) {
    return { success: false, message: `Failed to check brackets: ${matchError.message}` }
  }

  if (!matchCount || matchCount === 0) {
    return { success: false, message: 'Brackets must be generated before selecting participants for weigh-in.' }
  }

  // 2. Reset any previous weigh-in selections to ensure consistent 20% selection
  const { error: resetError } = await supabase
    .from('tournament_registrations')
    .update({ weigh_in_selected: false })
    .eq('tournament_id', tournamentId)
    .eq('weigh_in_selected', true)

  if (resetError) {
    console.error('Failed to reset previous selections:', resetError)
    // Don't fail the whole operation, just log it
  }

  // 3. Fetch verified registrations with division info
  const { data: rawRegistrations, error: regError } = await supabase
    .from('tournament_registrations')
    .select(`
      id, 
      division_id, 
      category_id,
      tournament_divisions (
        name
      )
    `)
    .eq('tournament_id', tournamentId)
    .in('status', ['verified', 'paid'])

  if (regError) {
    return { success: false, message: `Failed to fetch registrations: ${regError.message}` }
  }

  if (!rawRegistrations || rawRegistrations.length === 0) {
    return { success: false, message: 'No verified participants found.' }
  }

  // Filter out "Gradeschool" divisions
  const registrations = rawRegistrations.filter(reg => {
    // Type assertion or check safe navigation
    const divisionName = (reg.tournament_divisions as any)?.name || ''
    return !divisionName.toLowerCase().includes('gradeschool')
  })

  if (registrations.length === 0) {
    return { success: false, message: 'No eligible participants found (Gradeschool excluded).' }
  }

  // 4. Group by category
  const groupedHelper: Record<string, typeof registrations> = {}
  registrations.forEach(reg => {
    const key = `${reg.division_id}-${reg.category_id}`
    if (!groupedHelper[key]) groupedHelper[key] = []
    groupedHelper[key].push(reg)
  })

  // 5. Select random participants (20%, min 1 per category)
  const idsToSelect: string[] = []
  const PERCENTAGE = 0.2

  Object.values(groupedHelper).forEach(group => {
    if (group.length === 0) return

    const countToSelect = Math.max(1, Math.ceil(group.length * PERCENTAGE))
    const shuffled = [...group].sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, countToSelect)

    selected.forEach(s => idsToSelect.push(s.id))
  })

  // 6. Update database
  if (idsToSelect.length > 0) {
    const { error: updateError } = await supabase
      .from('tournament_registrations')
      .update({ weigh_in_selected: true })
      .in('id', idsToSelect)

    if (updateError) {
      return { success: false, message: `Failed to update participants: ${updateError.message}` }
    }
  }

  revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}`)
  revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/weigh-in`)

  return { success: true, message: `Successfully selected ${idsToSelect.length} participants for weigh-in.`, count: idsToSelect.length }
}

/**
 * Submit weigh-in result for a participant
 */
export async function submitWeighInResult(
  registrationId: string,
  weight: number,
  tournamentId: string,
  height?: number
): Promise<{ success: boolean; message: string }> {
  const supabase = createServerSupabaseClient()

  // 1. Fetch registration with category details to get max weight
  const { data: registration, error: fetchError } = await supabase
    .from('tournament_registrations')
    .select(`
      *,
      tournament_categories (
        max_weight
      )
    `)
    .eq('id', registrationId)
    .single()

  if (fetchError || !registration) {
    return { success: false, message: 'Registration not found.' }
  }

  const category = registration.tournament_categories
  // If no category or no max weight (e.g. open weight), they pass.
  // Although open weight usually has no max limit.
  // If max_weight is null, traverse assumption: unlimited.

  const maxWeight = category?.max_weight
  let disqualified = false
  let reason: string | null = null

  if (maxWeight) {
    const tolerance = maxWeight * 0.05
    const limit = maxWeight + tolerance
    if (weight > limit) {
      disqualified = true
      reason = `Weigh-in Failed: ${weight}kg exceeds limit ${limit.toFixed(2)}kg (Max ${maxWeight} + 5%)`
    }
  }

  // 2. Update registration
  const { error: updateError } = await supabase
    .from('tournament_registrations')
    .update({
      actual_weight: weight,
      actual_height: height || null,
      weighed_in_at: new Date().toISOString(),
      disqualified: disqualified,
      disqualification_reason: reason
    })
    .eq('id', registrationId)

  if (updateError) {
    return { success: false, message: `Failed to update weigh-in: ${updateError.message}` }
  }

  // 3. Auto-forfeit match if disqualified
  if (disqualified) {
    try {
      const { findActiveMatchForParticipant, forfeitMatch } = await import('@/lib/db/queries/matches')

      // We need the player_id, which we can get from the registration object we fetched earlier
      if (registration.player_id) {
        const activeMatch = await findActiveMatchForParticipant(registration.player_id, tournamentId)

        if (activeMatch) {
          console.log(`[WEIGH-IN FAILURE] Auto-forfeiting match ${activeMatch.id} for player ${registration.player_id}`)
          await forfeitMatch(activeMatch.id, registration.player_id)
        }
      }
    } catch (err) {
      console.error('[WEIGH-IN FAILURE] Failed to auto-forfeit match:', err)
      // Don't fail the whole action, just log it. The participant is already DQ'd in registration.
    }
  }

  revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/weigh-in`)
  revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/bracket`)
  return { success: true, message: disqualified ? 'Participant disqualified and match forfeited.' : 'Weigh-in verified successfully.' }
}
