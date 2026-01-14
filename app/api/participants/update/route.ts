import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { updatePlayer } from '@/lib/db/queries/players'
import { createServerSupabaseClient } from '@/lib/supabase/server'
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

    // Also sync to tournament_registrations to ensure bracket generation works
    // If the user is editing measurements, we assume these are the "actual" values for the tournament
    const supabase = await createServerSupabaseClient()
    await supabase.from('tournament_registrations')
      .update({
        actual_weight: weight,
        actual_height: height,
        // Mark as weighed-in if we are saving valid measurements
        weighed_in_at: (weight || height) ? new Date().toISOString() : undefined
      })
      .eq('tournament_id', tournamentId)
      .eq('player_id', playerId)

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
