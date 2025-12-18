import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getTeamById } from '@/lib/db/queries/teams'
import { createPlayer } from '@/lib/db/queries/players'
import { addPlayerToTeam } from '@/lib/db/queries/teams'
import { createRegistration } from '@/lib/db/queries/registrations'
import { revalidatePath } from 'next/cache'
import { routes } from '@/config/routes'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      tournamentId,
      player_id,
      first_name,
      last_name,
      email,
      dob,
      gender,
      weight,
      height,
      belt_level,
      team_id,
    } = body

    // Validate required fields
    if (!tournamentId || !team_id) {
      return NextResponse.json({ error: 'Missing required tournament or team ID' }, { status: 400 })
    }

    if (!player_id && (!first_name || !last_name || !email || !dob || !gender || !belt_level)) {
      return NextResponse.json({ error: 'Missing required player fields' }, { status: 400 })
    }

    // Get team to verify it exists and get coach_id
    const team = await getTeamById(team_id)
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    let finalPlayerId = player_id

    if (player_id) {
      // Update existing player with provided details
      // We update the player record to keep it current
      await import('@/lib/db/queries/players').then(mod => mod.updatePlayer(player_id, {
        first_name,
        last_name,
        email: email || null,
        dob: dob || null,
        gender: gender || null,
        weight: weight || null,
        height: height || null,
        belt_level: belt_level || null,
      }))
    } else {
      // Create new player
      const player = await createPlayer({
        first_name,
        last_name,
        email,
        dob,
        gender,
        weight,
        height,
        belt_level,
        coach_id: team.user_id,
      })
      finalPlayerId = player.id
    }

    // Add player to team (ignore if already added)
    try {
      await addPlayerToTeam(team.id, finalPlayerId)
    } catch (error: any) {
      // Ignore unique violation (player already on team)
      if (!error.message?.includes('duplicate key value') && !error.message?.includes('unique constraint')) {
        console.warn('Error adding player to team (might be already added):', error)
      }
    }

    // Create tournament registration
    // Check if checks are required here (duplicate registration?)
    // createRegistration will likely throw if unique constraint on (tournament_id, player_id) exists

    // We add actual_weight/height to registration from the form data as well, 
    // assuming the form reflects current status
    await createRegistration({
      tournament_id: tournamentId,
      team_id: team.id,
      player_id: finalPlayerId,
      coach_id: team.user_id,
      status: 'verified', // Auto-verified since organizer added them
      actual_weight: weight || null,
      actual_height: height || null,
      disqualified: false,
      disqualification_reason: null,
      weighed_in_at: null,
      weigh_in_selected: false,
    })

    revalidatePath(routes.organizer.tournamentParticipants(tournamentId))

    return NextResponse.json({ success: true, playerId: finalPlayerId })
  } catch (error: any) {
    console.error('Error adding participant:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add participant' },
      { status: 500 }
    )
  }
}
