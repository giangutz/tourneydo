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
    if (!tournamentId || !first_name || !last_name || !email || !dob || !gender || !belt_level || !team_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get team to verify it exists and get coach_id
    const team = await getTeamById(team_id)
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Create player
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

    // Add player to team
    await addPlayerToTeam(team.id, player.id)

    // Create tournament registration
    await createRegistration({
      tournament_id: tournamentId,
      team_id: team.id,
      player_id: player.id,
      coach_id: team.user_id,
      status: 'verified', // Auto-verified since organizer added them
    })

    revalidatePath(routes.organizer.tournamentParticipants(tournamentId))

    return NextResponse.json({ success: true, player })
  } catch (error: any) {
    console.error('Error adding participant:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add participant' },
      { status: 500 }
    )
  }
}
