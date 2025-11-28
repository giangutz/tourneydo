'use server'

import { registerTeamForTournament } from "@/lib/db/queries/registrations"
import { auth } from "@clerk/nextjs/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function registerTeam(tournamentId: string, teamId: string, playerIds: string[]) {
  const { userId } = await auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  try {
    // Check registration deadline
    const { data: tournament, error: tournamentError } = await createServerSupabaseClient()
      .from('tournaments')
      .select('registration_deadline')
      .eq('id', tournamentId)
      .single()

    if (tournamentError) {
      throw new Error("Failed to fetch tournament details")
    }

    if (tournament.registration_deadline && new Date(tournament.registration_deadline) < new Date()) {
      throw new Error("Registration deadline has passed")
    }

    await registerTeamForTournament(tournamentId, teamId, userId, playerIds)
    revalidatePath('/dashboard/coach/tournaments')
    return { success: true }
  } catch (error) {
    console.error("Registration error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to register" }
  }
}
