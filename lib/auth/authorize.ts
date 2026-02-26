/**
 * Tournament Authorization Helper
 *
 * Centralises the "can this user act on this tournament?" check that was
 * previously copy-pasted across server actions.
 *
 * Usage in a server action:
 *   const authResult = await authorizeForTournament(userId, tournamentId)
 *   if (!authResult.authorized) return { success: false, error: authResult.error }
 *
 * Usage with a required role:
 *   const authResult = await authorizeForTournament(userId, tournamentId, ['organizer'])
 *   // Only the organizer is allowed; active staff are blocked.
 */

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getTournamentById } from '@/lib/db/queries/tournaments'

export type TournamentRole = 'organizer' | 'staff'

export type AuthorizeResult =
  | { authorized: true;  role: TournamentRole }
  | { authorized: false; error: string }

/**
 * Check whether `userId` is authorized to act on `tournamentId`.
 *
 * @param userId        - Clerk user ID of the caller
 * @param tournamentId  - Tournament being accessed
 * @param requiredRoles - If provided, the caller must have one of these roles.
 *                        Default: accept both 'organizer' and 'staff'.
 */
export async function authorizeForTournament(
  userId: string,
  tournamentId: string,
  requiredRoles: TournamentRole[] = ['organizer', 'staff']
): Promise<AuthorizeResult> {
  const tournament = await getTournamentById(tournamentId)
  if (!tournament) {
    return { authorized: false, error: 'Tournament not found' }
  }

  // Check organizer first (cheapest query)
  if (tournament.organizer_id === userId) {
    if (requiredRoles.includes('organizer')) {
      return { authorized: true, role: 'organizer' }
    }
    return { authorized: false, error: 'This action is restricted to staff members' }
  }

  // If organizer-only is required, deny non-organizers immediately
  if (requiredRoles.length === 1 && requiredRoles[0] === 'organizer') {
    return { authorized: false, error: 'Only the tournament organizer can perform this action' }
  }

  // Check active staff record
  const supabase = createServerSupabaseClient()
  const { data: staffRecord } = await supabase
    .from('tournament_staff')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (staffRecord) {
    return { authorized: true, role: 'staff' }
  }

  return { authorized: false, error: 'Not authorized to manage this tournament' }
}
