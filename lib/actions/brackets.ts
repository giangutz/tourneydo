'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { saveBracket } from '@/lib/db/queries/matches'
import { generateBracket } from '@/lib/utils/bracket-generator'
import { safeAction } from '@/lib/utils/errors'
import { routes } from '@/config/routes'
import type { ActionResult } from '@/types/api'

/**
 * Generate and save bracket for a tournament
 */
export async function generateTournamentBracket(tournamentId: string): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Unauthorized')
    }

    // 1. Fetch participants
    const participants = await getTournamentParticipants(tournamentId)

    // Filter only approved participants? Or all?
    // Usually only approved/paid.
    const confirmedParticipants = participants.filter(p => p.status === 'approved')

    if (confirmedParticipants.length < 2) {
      throw new Error('Need at least 2 approved participants to generate a bracket')
    }

    // 2. Generate matches
    const matches = generateBracket(tournamentId, confirmedParticipants)

    // 3. Save to DB
    await saveBracket(tournamentId, matches)

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
  })
}
