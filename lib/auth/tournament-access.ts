/**
 * Tournament access control helpers
 *
 * Functions to check if a user has access to manage a tournament
 * either as the organizer or as staff with array-based roles.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { auth } from '@clerk/nextjs/server'
import { TournamentRole } from '@/types/models'


// Map specific capabilities to roles
const ROLE_PERMISSIONS: Record<TournamentRole, string[]> = {
  admin: ['all'],
  staff: ['participants', 'bracket', 'weigh-in', 'matches'],
  bracket_manager: ['bracket', 'matches'],
  registration_manager: ['participants'],
  weigh_in_staff: ['weigh-in'],
  official: ['matches', 'weigh-in']
}

export async function checkTournamentAccess(
  tournamentId: string,
  requiredCapability?: string
): Promise<{ hasAccess: boolean; userRoles?: TournamentRole[]; isOrganizer?: boolean }> {
  const { userId } = await auth()
  if (!userId) return { hasAccess: false }

  const supabase = createServerSupabaseClient()

  // Check if user is organizer
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('organizer_id')
    .eq('id', tournamentId)
    .single()

  if (tournament?.organizer_id === userId) {
    return { hasAccess: true, userRoles: ['admin'], isOrganizer: true }
  }

  // Check if user is staff
  const { data: staffRecord } = await supabase
    .from('tournament_staff')
    .select('roles')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (!staffRecord) return { hasAccess: false }

  const userRoles = staffRecord.roles as TournamentRole[]

  // Check capability permission
  if (requiredCapability) {
    const permissions = userRoles.flatMap(r => ROLE_PERMISSIONS[r] || [])
    const hasAll = permissions.includes('all')
    if (hasAll) return { hasAccess: true, userRoles, isOrganizer: false }

    const hasPermission = permissions.includes(requiredCapability)
    return { hasAccess: hasPermission, userRoles, isOrganizer: false }
  }

  return { hasAccess: true, userRoles, isOrganizer: false }
}

/**
 * Get all tournaments where the user is organizer or staff
 */
export async function getUserTournaments() {
  const { userId } = await auth()
  if (!userId) return []

  const supabase = createServerSupabaseClient()

  // Get tournaments where user is organizer
  const { data: organizedTournaments } = await supabase
    .from('tournaments')
    .select('*')
    .eq('organizer_id', userId)
    .order('created_at', { ascending: false })

  // Get tournaments where user is staff
  const { data: staffAssignments } = await supabase
    .from('tournament_staff')
    .select('tournament_id, roles, tournaments(*)')
    .eq('user_id', userId)
    .eq('status', 'active')

  const staffTournaments = staffAssignments?.map((s) => ({
    ...(s.tournaments as Record<string, unknown>),
    _staffRoles: s.roles
  })) || []

  return {
    organized: organizedTournaments || [],
    staff: staffTournaments
  }
}
