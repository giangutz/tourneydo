'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { invalidateMatchesCache } from '@/lib/cache/result-cache'

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

  // 2. Reset any previous random weigh-in selections and clear ONLY random-specific columns.
  // Official weigh-in data (actual_weight, weighed_in_at, disqualified, etc.) is intentionally
  // left untouched so that deleting/regenerating the random list never overwrites official records.
  const { error: resetError } = await supabase
    .from('tournament_registrations')
    .update({
      weigh_in_selected: false,
      random_weigh_in_weight: null,
      random_weigh_in_at: null,
      random_weigh_in_passed: null,
      random_weigh_in_by: null,
    })
    .eq('tournament_id', tournamentId)
    .eq('weigh_in_selected', true)

  if (resetError) {
    console.error('Failed to reset previous selections:', resetError)
    // Don't fail the whole operation, just log it
  }

  // 3. Fetch verified registrations with division and category info
  const { data: rawRegistrations, error: regError } = await supabase
    .from('tournament_registrations')
    .select(`
      id,
      division_id,
      category_id,
      tournament_divisions (
        name
      ),
      tournament_categories (
        max_weight
      )
    `)
    .eq('tournament_id', tournamentId)
    .eq('status', 'verified')

  if (regError) {
    return { success: false, message: `Failed to fetch registrations: ${regError.message}` }
  }

  if (!rawRegistrations || rawRegistrations.length === 0) {
    return { success: false, message: 'No verified participants found.' }
  }

  // Random weigh-in applies to weight divisions only:
  // - Exclude "Gradeschool" divisions (height-based for under-12)
  // - Exclude any category without a max_weight (height-only categories)
  const registrations = rawRegistrations.filter(reg => {
    const divisionName = (reg.tournament_divisions as any)?.name || ''
    const maxWeight = (reg.tournament_categories as any)?.max_weight
    return !divisionName.toLowerCase().includes('gradeschool') && maxWeight != null
  })

  if (registrations.length === 0) {
    return { success: false, message: 'No eligible participants found. Random weigh-in applies to weight divisions only.' }
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

  // 6. Update database — mark as selected and reset ONLY random columns so they
  // start as "Pending" on the random list. Official weigh-in data is left untouched.
  if (idsToSelect.length > 0) {
    const { error: updateError } = await supabase
      .from('tournament_registrations')
      .update({
        weigh_in_selected: true,
        random_weigh_in_weight: null,
        random_weigh_in_at: null,
        random_weigh_in_passed: null,
        random_weigh_in_by: null,
      })
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

  // 1. Fetch registration with category details to get limits
  const { data: registration, error: fetchError } = await supabase
    .from('tournament_registrations')
    .select(`
      *,
      players (
        dob,
        gender
      ),
      tournament_categories (
        name,
        gender,
        min_weight,
        max_weight,
        min_height,
        max_height
      )
    `)
    .eq('id', registrationId)
    .single()

  if (fetchError || !registration) {
    return { success: false, message: 'Registration not found.' }
  }

  // ONLY verified participants can be weighed in
  if (registration.status !== 'verified') {
    return { success: false, message: 'Only verified participants can be weighed in. Please verify their payment first.' }
  }

  const { validateWeightHeight } = await import('@/lib/utils/weigh-in-validator')
  const { calculateAge } = await import('@/lib/constants/divisions')

  const category: any = registration.tournament_categories
  const age = registration.players?.dob ? calculateAge(registration.players.dob) : 0

  // Map DB fields to validator format
  const categoryConfig = {
    name: category.name,
    gender: category.gender,
    minWeight: category.min_weight,
    maxWeight: category.max_weight,
    minHeight: category.min_height,
    maxHeight: category.max_height
  }

  // Validate with 5% tolerance for surprise weigh-ins? 
  // For now, let's stick to the official validation logic but include tolerance calculation if that's the rule
  const validation = validateWeightHeight(weight, height ?? null, categoryConfig, age)

  let disqualified = false
  let reason: string | null = null

  if (!validation.valid) {
    // Re-check with 5% tolerance for weight-based surprise checks
    const maxWeight = category.max_weight
    if (maxWeight && weight > maxWeight) {
      const tolerance = maxWeight * 0.05
      const limit = maxWeight + tolerance
      if (weight > limit) {
        disqualified = true
        reason = `Weigh-in Failed: ${weight}kg exceeds limit ${limit.toFixed(2)}kg (Max ${maxWeight} + 5%)`
      } else {
        // Passed with tolerance
        disqualified = false
      }
    } else {
      // Failed height or min weight - usually no tolerance for these in surprise checks?
      // For now, mark as disqualified if validator says so and it's not the weight tolerance case
      disqualified = true
      reason = `Weigh-in Failed: Measurements out of range for ${category.name}`
    }
  }

  // 2. Always write to random-specific columns (never overwrites official weigh-in data)
  const { error: updateError } = await supabase
    .from('tournament_registrations')
    .update({
      random_weigh_in_weight: weight,
      random_weigh_in_at: new Date().toISOString(),
      random_weigh_in_passed: !disqualified,
      random_weigh_in_by: null,
    })
    .eq('id', registrationId)

  if (updateError) {
    return { success: false, message: `Failed to update weigh-in: ${updateError.message}` }
  }

  // On DQ — propagate to official record so the athlete is marked disqualified everywhere
  if (disqualified) {
    await supabase
      .from('tournament_registrations')
      .update({
        disqualified: true,
        disqualification_reason: reason,
      })
      .eq('id', registrationId)
  }

  // 3. Auto-forfeit match if disqualified
  // Removes them from the court queue, advances the opponent, and frees the court slot.
  if (disqualified) {
    try {
      const { findActiveMatchForParticipant, forfeitMatch } = await import('@/lib/db/queries/matches')

      if (registration.player_id) {
        const activeMatch = await findActiveMatchForParticipant(registration.player_id, tournamentId)

        if (activeMatch) {
          console.log(`[WEIGH-IN FAILURE] Auto-forfeiting match ${activeMatch.id} for player ${registration.player_id}`)
          await forfeitMatch(activeMatch.id, registration.player_id)
        }
      }
    } catch (err) {
      console.error('[WEIGH-IN FAILURE] Failed to auto-forfeit match:', err)
      // Non-fatal — participant is already DQ'd in registration.
    }

    // Invalidate match cache so court queue reflects the forfeit immediately
    invalidateMatchesCache(tournamentId)
  }

  revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/weigh-in`)
  revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/bracket`)
  revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/matches`)
  return { success: true, message: disqualified ? 'Participant disqualified and match forfeited.' : 'Weigh-in verified successfully.' }
}
