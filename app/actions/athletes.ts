'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { createClerkSupabaseClient } from '@/lib/supabase/client'
import { revalidatePath } from 'next/cache'
import { BeltLevel, Gender, Database } from '@/lib/supabase/types'
import { SupabaseClient } from '@supabase/supabase-js'

export async function getAthletes() {
  const { userId, getToken } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const supabase: SupabaseClient<Database> = createClerkSupabaseClient(getToken)

  // First get the team for this coach
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('coach_user_id', userId)
    .single()

  if (!team) return { data: [] }

  const { data: athletes, error } = await supabase
    .from('athletes')
    .select('*')
    .eq('team_id', team.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { data: athletes }
}

export async function createAthlete(formData: FormData) {
  const { userId, getToken, sessionClaims } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const supabase: SupabaseClient<Database> = createClerkSupabaseClient(getToken)

  // Ensure team exists
  let { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('coach_user_id', userId)
    .single()

  if (!team) {
    // Create team if it doesn't exist
    const clubName = (sessionClaims?.metadata as any)?.clubName || 'My Team'
    const { data: newTeam, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: clubName,
        coach_user_id: userId,
      })
      .select()
      .single()

    if (teamError) return { error: 'Failed to create team: ' + teamError.message }
    team = newTeam
  }

  const name = formData.get('name') as string
  const age = parseInt(formData.get('age') as string)
  const weight = parseFloat(formData.get('weight') as string)
  const belt_level = formData.get('belt_level') as BeltLevel
  const gender = formData.get('gender') as Gender

  const { error } = await supabase
    .from('athletes')
    .insert({
      team_id: team!.id,
      name,
      age,
      weight,
      belt_level,
      gender,
    })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/coach/team')
  return { success: true }
}

export async function updateAthlete(athleteId: string, formData: FormData) {
  const { userId, getToken } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const supabase: SupabaseClient<Database> = createClerkSupabaseClient(getToken)

  const name = formData.get('name') as string
  const age = parseInt(formData.get('age') as string)
  const weight = parseFloat(formData.get('weight') as string)
  const belt_level = formData.get('belt_level') as BeltLevel
  const gender = formData.get('gender') as Gender

  const { error } = await supabase
    .from('athletes')
    .update({
      name,
      age,
      weight,
      belt_level,
      gender,
    })
    .eq('id', athleteId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/coach/team')
  return { success: true }
}

export async function deleteAthlete(athleteId: string) {
  const { userId, getToken } = await auth()
  if (!userId) return { error: 'Unauthorized' }

  const supabase: SupabaseClient<Database> = createClerkSupabaseClient(getToken)

  const { error } = await supabase
    .from('athletes')
    .delete()
    .eq('id', athleteId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/coach/team')
  return { success: true }
}
