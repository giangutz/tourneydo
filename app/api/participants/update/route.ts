import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { updatePlayer } from '@/lib/db/queries/players'
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
      playerId,
      tournamentId,
      first_name,
      last_name,
      email,
      dob,
      gender,
      weight,
      height,
      belt_level,
    } = body

    // Validate required fields
    if (!playerId || !tournamentId || !first_name || !last_name || !email || !dob || !gender || !belt_level) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Update player
    await updatePlayer(playerId, {
      first_name,
      last_name,
      email,
      dob,
      gender,
      weight,
      height,
      belt_level,
    })

    revalidatePath(routes.organizer.tournamentParticipants(tournamentId))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating participant:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update participant' },
      { status: 500 }
    )
  }
}
