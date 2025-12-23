'use server'

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { TournamentStaff, TournamentRole } from "@/types/models"
import { sendStaffInvitationEmail } from "@/lib/email"

export async function inviteStaff(tournamentId: string, email: string, role: TournamentRole) {
  try {
    const session = await auth()
    if (!session?.userId) {
      throw new Error("Unauthorized")
    }

    const supabase = createServerSupabaseClient()

    // 1. Get Tournament Details (for email)
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('name')
      .eq('id', tournamentId)
      .single()

    if (!tournament) throw new Error("Tournament not found")

    // 2. Check if user exists in our users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', email)
      .single()

    const userId = (existingUser as any)?.user_id || null
    const status = userId ? 'active' : 'pending'

    // 3. Insert into tournament_staff
    const { error } = await supabase
      .from('tournament_staff' as any)
      .insert({
        tournament_id: tournamentId,
        email: email,
        role: role,
        user_id: userId,
        status: status
      })

    if (error) {
      if (error.code === '23505') {
        throw new Error("This user is already invited or part of the staff.")
      }
      throw new Error(error.message)
    }

    // ... (previous code)

    // 4. Send Email Invitation
    const emailResult = await sendStaffInvitationEmail({
      email,
      role,
      tournamentName: tournament.name,
      tournamentId,
    })

    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/staff`)

    if (!emailResult.success) {
      return { success: true, warning: `Staff added, but email failed: ${emailResult.error}` }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function resendStaffInvitation(staffId: string, tournamentId: string) {
  try {
    const session = await auth()
    if (!session?.userId) {
      throw new Error("Unauthorized")
    }

    const supabase = createServerSupabaseClient()

    // 1. Get Staff & Tournament Details
    const { data: staffMember, error: staffError } = await supabase
      .from('tournament_staff' as any)
      .select('*, tournaments(name)')
      .eq('id', staffId)
      .single()

    if (staffError || !staffMember) throw new Error("Staff member not found")

    // Rate Limiting Check
    const memberData = staffMember as any
    const lastInvited = memberData.last_invited_at ? new Date(memberData.last_invited_at) : null
    if (lastInvited) {
      const timeSinceLastInvite = new Date().getTime() - lastInvited.getTime()
      const cooldown = 60000 // 1 minute in ms

      if (timeSinceLastInvite < cooldown) {
        const remainingSeconds = Math.ceil((cooldown - timeSinceLastInvite) / 1000)
        throw new Error(`Please wait ${remainingSeconds}s before resending.`)
      }
    }

    const tournamentName = (staffMember as any).tournaments?.name || "Tournament"

    // 2. Send Email
    const member = staffMember as any
    const emailResult = await sendStaffInvitationEmail({
      email: member.email,
      role: member.role,
      tournamentName: tournamentName,
      tournamentId,
    })

    if (!emailResult.success) {
      throw new Error(`Email failed: ${emailResult.error}`)
    }

    // 3. Update last_invited_at
    await supabase
      .from('tournament_staff' as any)
      .update({ last_invited_at: new Date().toISOString() })
      .eq('id', staffId)

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function removeStaff(staffId: string, tournamentId: string) {
  try {
    const session = await auth()
    if (!session?.userId) {
      throw new Error("Unauthorized")
    }

    const supabase = createServerSupabaseClient()

    const { error } = await supabase
      .from('tournament_staff' as any)
      .delete()
      .eq('id', staffId)

    if (error) throw new Error(error.message)

    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/staff`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}


export async function updateStaffRole(staffId: string, newRole: TournamentRole, tournamentId: string) {
  try {
    const session = await auth()
    if (!session?.userId) {
      throw new Error("Unauthorized")
    }

    const supabase = createServerSupabaseClient()

    // 1. Verify Organizer Permission (implicit via RLS, but good to double check or catch early)
    // The RLS "Organizers can manage staff" should handle the update permission, 
    // but explicit check protects against logic errors.

    // 2. Update Role
    const { error } = await supabase
      .from('tournament_staff' as any)
      .update({ role: newRole })
      .eq('id', staffId)
      .select()
      .single()

    if (error) throw new Error(error.message)

    revalidatePath(`/dashboard/tournament-organizer/tournaments/${tournamentId}/staff`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
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
    .from('tournament_staff' as any)
    .select('*', { count: 'exact' })
    .eq('tournament_id', tournamentId)

  // Apply search
  if (search) {
    query = query.ilike('email', `%${search}%`)
  }

  // Apply role filter
  if (role && role !== 'all') {
    query = query.eq('role', role)
  }

  // Apply pagination
  const from = (page - 1) * limit
  const to = from + limit - 1

  query = query.order('created_at', { ascending: false }).range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error("Error fetching staff:", error.message, error.code, JSON.stringify(error, null, 2))
    return { data: [], total: 0, totalPages: 0 }
  }

  return {
    data: data as unknown as TournamentStaff[],
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit)
  }
}
