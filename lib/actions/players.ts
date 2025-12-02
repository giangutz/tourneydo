/**
 * Player server actions
 * 
 * Server actions for player management with proper validation and error handling
 */

'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { createPlayer, updatePlayer as updatePlayerQuery, deletePlayer as deletePlayerQuery } from '@/lib/db/queries/players'
import { addPlayersToTeam } from '@/lib/db/queries/teams'
import { playerFormSchema, assignPlayerToTeamsSchema } from '@/lib/validations/player'
import { createActionSuccess, createActionError, safeAction } from '@/lib/utils/errors'
import { routes } from '@/config/routes'
import type { ActionResult } from '@/types/api'
import type { Player } from '@/types/models'


/**
 * Create a new player
 */
export async function createPlayerAction(formData: FormData): Promise<ActionResult<Player>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    // Parse and validate form data
    const rawData = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: formData.get('email') as string,
      dob: formData.get('dob') as string,
    }

    const validated = playerFormSchema.parse(rawData)

    // Create player
    const player = await createPlayer({
      first_name: validated.first_name,
      last_name: validated.last_name,
      email: validated.email || null,
      dob: validated.dob || null,
      coach_id: userId,
      weight: null,
      height: null,
      belt_level: null,
      gender: null,
    } as any)

    // Handle team assignments if provided
    const teamIds = formData.get('team_ids') as string
    if (teamIds) {
      const teamIdArray = JSON.parse(teamIds) as string[]
      if (teamIdArray.length > 0) {
        await addPlayersToTeam(player.id, teamIdArray)
      }
    }

    revalidatePath(routes.coach.players)

    return player
  })
}

/**
 * Update an existing player
 */
export async function updatePlayerAction(id: string, formData: FormData): Promise<ActionResult<Player>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    // Parse and validate form data
    const rawData = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: formData.get('email') as string,
      dob: formData.get('dob') as string,
    }

    const validated = playerFormSchema.parse(rawData)

    // Update player
    const player = await updatePlayerQuery(id, {
      first_name: validated.first_name,
      last_name: validated.last_name,
      email: validated.email || null,
      dob: validated.dob || null,
    })

    revalidatePath(routes.coach.players)
    revalidatePath(routes.coach.playerDetail(id))

    return player
  })
}

/**
 * Delete a player
 */
export async function deletePlayerAction(id: string): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    await deletePlayerQuery(id)

    revalidatePath(routes.coach.players)
  })
}

/**
 * Assign player to teams
 */
export async function assignPlayerToTeamsAction(playerId: string, teamIds: string[]): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    const validated = assignPlayerToTeamsSchema.parse({ player_id: playerId, team_ids: teamIds })

    await addPlayersToTeam(validated.player_id, validated.team_ids)

    revalidatePath(routes.coach.players)
    revalidatePath(routes.coach.playerDetail(playerId))
  })
}
