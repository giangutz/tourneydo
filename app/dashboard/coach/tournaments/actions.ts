'use server'

import { registerTeamForTournament } from "@/lib/db/queries/registrations"
import { updatePlayer } from "@/lib/db/queries/players"
import { auth } from "@clerk/nextjs/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { Player, PlayerUpdate } from "@/types/models"

export async function manageTournamentRegistrations(
  tournamentId: string,
  plannedRegistrations: Record<string, string[]>, // teamId -> playerIds[]
  updates: Record<string, Partial<Player>>
) {
  const { userId } = await auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  try {
    const supabase = createServerSupabaseClient()

    // 1. Check Deadline
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('registration_deadline')
      .eq('id', tournamentId)
      .single()

    if (tournamentError) throw new Error("Failed to fetch tournament details")

    if (tournament.registration_deadline && new Date(tournament.registration_deadline) < new Date()) {
      throw new Error("Registration deadline has passed")
    }

    // 2. Process Inline Updates (Parallel)
    const updatePromises = Object.entries(updates).map(async ([playerId, data]) => {
      const cleanData: PlayerUpdate = {}
      if (data.weight !== undefined) cleanData.weight = data.weight
      if (data.height !== undefined) cleanData.height = data.height
      if (data.belt_level !== undefined) cleanData.belt_level = data.belt_level as any

      if (Object.keys(cleanData).length > 0) {
        await updatePlayer(playerId, cleanData)
      }
    })

    await Promise.all(updatePromises)

    // 3. Process Registrations for each team
    // First, get ALL current registrations for this coach in this tournament
    const { data: currentRegs, error: fetchRegsError } = await supabase
      .from('tournament_registrations')
      .select('player_id, team_id, status')
      .eq('tournament_id', tournamentId)
      .eq('coach_id', userId)

    if (fetchRegsError) throw new Error("Failed to fetch current registrations")

    const currentRegMap = new Map(currentRegs.map(r => [r.player_id, r]))

    // Players currently desired across ALL teams
    const allPlannedPlayerIds = Object.values(plannedRegistrations).flat()

    // Safety check: Ensure no player is registered to multiple teams in the plan
    const playerCounts = allPlannedPlayerIds.reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const duplicates = Object.entries(playerCounts).filter(([_, count]) => count > 1)
    if (duplicates.length > 0) {
      throw new Error("Cannot register a player under multiple teams in the same tournament.")
    }

    // Iterate through all teams specified in the plan (and those currently in DB)
    const allTouchedTeamIds = new Set([...Object.keys(plannedRegistrations), ...currentRegs.map(r => r.team_id)])

    for (const teamId of allTouchedTeamIds) {
      const desiredPlayerIds = plannedRegistrations[teamId] || []
      const currentTeamRegs = currentRegs.filter(r => r.team_id === teamId)
      const currentTeamPlayerIds = currentTeamRegs.map(r => r.player_id)

      // To Add: In plan for THIS team, but not currently in DB for THIS tournament 
      // (Wait, even if in DB for ANOTHER team, it should be moved or deleted first)
      const toAdd = desiredPlayerIds.filter(id => !currentRegMap.has(id))

      // To Remove: In DB for THIS team, but not in plan for THIS team
      const toRemove = currentTeamPlayerIds.filter(id => !desiredPlayerIds.includes(id))

      // Move detection: In plan for THIS team, but currently in DB for ANOTHER team
      const toMove = desiredPlayerIds.filter(id => {
        const current = currentRegMap.get(id)
        return current && current.team_id !== teamId
      })

      // 4. Handle Removals
      if (toRemove.length > 0) {
        // Filter out players who are actually being MOVED to another team (they will be handled by the moving loop)
        const actualToRemove = toRemove.filter(id => !allPlannedPlayerIds.includes(id))

        if (actualToRemove.length > 0) {
          const { error: deleteError } = await supabase
            .from('tournament_registrations')
            .delete()
            .eq('tournament_id', tournamentId)
            .in('player_id', actualToRemove)

          if (deleteError) throw new Error(`Failed to unregister players: ${deleteError.message}`)
        }
      }

      // 5. Handle Moves (Update team_id)
      for (const playerId of toMove) {
        const { error: moveError } = await supabase
          .from('tournament_registrations')
          .update({ team_id: teamId })
          .eq('tournament_id', tournamentId)
          .eq('player_id', playerId)

        if (moveError) throw new Error(`Failed to move player to new team: ${moveError.message}`)
      }

      // 6. Handle New Additions
      if (toAdd.length > 0) {
        await registerTeamForTournament(tournamentId, teamId, userId, toAdd)
      }
    }

    revalidatePath('/dashboard/coach/tournaments')
    revalidatePath(`/dashboard/coach/tournaments/${tournamentId}/register`)

    return { success: true }
  } catch (error) {
    console.error("Manage registration error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Failed to update registrations" }
  }
}

// Legacy adapter
export async function registerTeam(tournamentId: string, teamId: string, playerIds: string[]) {
  // This old function was just 'register these IDs'.
  return manageTournamentRegistrations(tournamentId, { [teamId]: playerIds }, {})
}

// Keep the old name for compatibility if needed, but better to use the new one.
export async function bulkRegisterAndUpdatePlayers(
  tournamentId: string,
  teamId: string,
  playerIds: string[],
  updates: Record<string, Partial<Player>>
) {
  return manageTournamentRegistrations(tournamentId, { [teamId]: playerIds }, updates)
}
