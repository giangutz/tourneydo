'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/supabase/types'

interface OnboardingResult {
  success?: boolean
  error?: string
  role?: UserRole
}

export const completeOnboarding = async (formData: FormData): Promise<OnboardingResult> => {
  const { isAuthenticated, userId } = await auth()

  if (!isAuthenticated || !userId) {
    return { error: 'No Logged In User' }
  }

  const role = formData.get('role') as UserRole
  const clubName = formData.get('clubName') as string | null

  if (!role || (role !== 'tournament-organizer' && role !== 'coach')) {
    return { error: 'Invalid role selected' }
  }

  if (role === 'coach' && (!clubName || clubName.trim().length === 0)) {
    return { error: 'Club name is required for coaches' }
  }

  const client = await clerkClient()

  try {
    // Get user email from Clerk
    const clerkUser = await client.users.getUser(userId)
    const email = clerkUser.emailAddresses[0]?.emailAddress

    if (!email) {
      return { error: 'User email not found' }
    }

    // Update Clerk metadata
    await client.users.updateUser(userId, {
      publicMetadata: {
        onboardingComplete: true,
        role,
        clubName: role === 'coach' ? clubName : undefined,
      },
    })

    // Store user in Supabase
    const supabase = await createServerSupabaseClient()

    // Insert or update user in Supabase
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        user_id: userId,
        email,
        role,
      } as any)

    if (userError) {
      console.error('Error storing user in Supabase:', userError)
      return { error: 'Failed to store user data' }
    }

    // If coach, also create team record
    if (role === 'coach' && clubName) {
      const { error: teamError } = await supabase
        .from('teams')
        .insert({
          name: clubName,
          user_id: userId,
        } as any)

      if (teamError) {
        console.error('Error storing team in Supabase:', teamError)
        return { error: 'Failed to store team data' }
      }
    }

    return { success: true, role }
  } catch (err) {
    console.error('Error completing onboarding:', err)
    return { error: 'There was an error completing onboarding.' }
  }
}