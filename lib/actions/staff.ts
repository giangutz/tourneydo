'use server'

import { createServerSupabaseClient, createServiceRoleSupabaseClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { SupabaseClient } from "@supabase/supabase-js"
import { TournamentStaff, TournamentRole } from "@/types/models"
import { sendStaffInvitationEmail } from "@/lib/email"

/**
 * Authorization guard for staff-management operations.
 * Only the tournament organizer or an active admin staff member may manage staff.
 */
async function requireStaffManageAccess(
  supabase: SupabaseClient,
  tournamentId: string,
  userId: string
): Promise<void> {
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('organizer_id')
    .eq('id', tournamentId)
    .single()

  if (tournament?.organizer_id === userId) return

  const { data: staffRecord } = await supabase
    .from('tournament_staff')
    .select('roles')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (!staffRecord?.roles?.includes('admin')) {
    throw new Error('Forbidden: Only organizers and admins can manage staff.')
  }
}

export async function inviteStaff(tournamentId: string, email: string, roles: TournamentRole[]) {
  try {
    const session = await auth()
    if (!session?.userId) {
      throw new Error("Unauthorized")
    }

    const supabase = createServerSupabaseClient()

    await requireStaffManageAccess(supabase, tournamentId, session.userId)

    // 1. Get Tournament Details (for email)
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('name')
      .eq('id', tournamentId)
      .single()

    if (!tournament) throw new Error("Tournament not found")

    // 2. Check if user exists — use service role to bypass RLS on users table
    //    (organizer's JWT can only read their own row; we need to look up the invitee)
    const serviceClient = createServiceRoleSupabaseClient()
    const { data: existingUser } = await serviceClient
      .from('users')
      .select('user_id')
      .eq('email', email)
      .single()

    const inviteeUserId = existingUser?.user_id || null
    const status = inviteeUserId ? 'active' : 'pending'

    // 3. Insert into tournament_staff
    const { error } = await supabase
      .from('tournament_staff')
      .insert({
        tournament_id: tournamentId,
        email: email,
        roles: roles,
        user_id: inviteeUserId,
        status: status
      })

    if (error) {
      if (error.code === '23505') {
        throw new Error("This user is already invited or part of the staff.")
      }
      throw new Error(error.message)
    }

    // 4. Send Email Invitation
    const emailResult = await sendStaffInvitationEmail({
      email,
      role: roles.join(', '),
      tournamentName: tournament.name,
      tournamentId,
    })

    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/staff`)

    if (!emailResult.success) {
      return { success: true, warning: `Staff added, but email failed: ${emailResult.error}` }
    }

    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export async function resendStaffInvitation(staffId: string, tournamentId: string) {
  try {
    const session = await auth()
    if (!session?.userId) {
      throw new Error("Unauthorized")
    }

    const supabase = createServerSupabaseClient()

    await requireStaffManageAccess(supabase, tournamentId, session.userId)

    // 1. Get Staff & Tournament Details
    const { data: staffMember, error: staffError } = await supabase
      .from('tournament_staff')
      .select('*, tournaments(name)')
      .eq('id', staffId)
      .single()

    if (staffError || !staffMember) throw new Error("Staff member not found")

    // Rate Limiting Check
    const lastInvited = staffMember.last_invited_at ? new Date(staffMember.last_invited_at) : null
    if (lastInvited) {
      const timeSinceLastInvite = new Date().getTime() - lastInvited.getTime()
      const cooldown = 60000 // 1 minute in ms

      if (timeSinceLastInvite < cooldown) {
        const remainingSeconds = Math.ceil((cooldown - timeSinceLastInvite) / 1000)
        throw new Error(`Please wait ${remainingSeconds}s before resending.`)
      }
    }

    const tournamentName = (staffMember.tournaments as { name: string } | null)?.name || "Tournament"

    // 2. Send Email
    const emailResult = await sendStaffInvitationEmail({
      email: staffMember.email,
      role: (staffMember.roles as string[]).join(', '),
      tournamentName: tournamentName,
      tournamentId,
    })

    if (!emailResult.success) {
      throw new Error(`Email failed: ${emailResult.error}`)
    }

    // 3. Update last_invited_at
    await supabase
      .from('tournament_staff')
      .update({ last_invited_at: new Date().toISOString() })
      .eq('id', staffId)

    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}

export async function removeStaff(staffId: string, tournamentId: string) {
  try {
    const session = await auth()
    if (!session?.userId) {
      throw new Error("Unauthorized")
    }

    const supabase = createServerSupabaseClient()

    await requireStaffManageAccess(supabase, tournamentId, session.userId)

    const { error } = await supabase
      .from('tournament_staff')
      .delete()
      .eq('id', staffId)

    if (error) throw new Error(error.message)

    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/staff`)
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}


export async function updateStaffRoles(staffId: string, newRoles: TournamentRole[], tournamentId: string) {
  try {
    const session = await auth()
    if (!session?.userId) {
      throw new Error("Unauthorized")
    }

    const supabase = createServerSupabaseClient()

    await requireStaffManageAccess(supabase, tournamentId, session.userId)

    const { error } = await supabase
      .from('tournament_staff')
      .update({ roles: newRoles })
      .eq('id', staffId)
      .select()
      .single()

    if (error) throw new Error(error.message)

    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/staff`)
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message }
  }
}


export async function getTournamentStaff(
  tournamentId: string,
  page: number = 1,
  limit: number = 10,
  search?: string,
  role?: string
) {
  const session = await auth()
  if (!session?.userId) return { data: [], total: 0, totalPages: 0 }

  const supabase = createServerSupabaseClient()

  let query = supabase
    .from('tournament_staff')
    .select('*', { count: 'exact' })
    .eq('tournament_id', tournamentId)

  // Apply search
  if (search) {
    query = query.ilike('email', `%${search}%`)
  }

  // Apply role filter — use array containment: roles @> ARRAY[role]
  if (role && role !== 'all') {
    query = query.contains('roles', [role])
  }

  // Apply pagination
  const from = (page - 1) * limit
  const to = from + limit - 1

  query = query.order('created_at', { ascending: false }).range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error("Error fetching staff:", error.message, error.code)
    return { data: [], total: 0, totalPages: 0 }
  }

  return {
    data: data as unknown as TournamentStaff[],
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  }
}
