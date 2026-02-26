'use server'

/**
 * Onboarding Server Actions
 *
 * Handles role selection and initial profile creation for new users.
 * Called once per user — subsequent visits to /onboarding are redirected
 * away by the layout guard.
 *
 * Security:
 *   - Requires authenticated Clerk session
 *   - Role validated server-side (not trusted from client)
 *   - Club name uniqueness enforced at DB level (unique index on lower(trim(name)))
 */

import { auth, clerkClient } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'
import type { UserRole } from '@/types/models'

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

    const { error: userError } = await supabase
      .from('users')
      .upsert({
        user_id: userId,
        email,
        first_name: clerkUser.firstName,
        last_name: clerkUser.lastName,
        role,
      } as any)

    if (userError) {
      logger.error({ userError, userId }, 'Error storing user in Supabase during onboarding')
      return { error: 'Failed to store user data' }
    }

    // If coach, create the team record
    if (role === 'coach' && clubName) {
      const { error: teamError } = await supabase
        .from('teams')
        .insert({
          name: clubName.trim(),
          user_id: userId,
        } as any)

      if (teamError) {
        // 23505 = unique_violation — club name already taken
        if (teamError.code === '23505') {
          // Roll back Clerk metadata update so the user can try again
          await client.users.updateUser(userId, {
            publicMetadata: { onboardingComplete: false },
          }).catch(() => {/* non-fatal */})
          return { error: 'A club with this name already exists. Please choose a different name.' }
        }

        logger.error({ teamError, userId, clubName }, 'Error creating team during onboarding')
        return { error: 'Failed to create your club. Please try again.' }
      }
    }

    logger.info({ userId, role }, 'Onboarding completed')
    return { success: true, role }
  } catch (err) {
    logger.error({ err, userId }, 'Unexpected error completing onboarding')
    Sentry.captureException(err, { tags: { action: 'complete_onboarding' } })
    return { error: 'There was an error completing onboarding.' }
  }
}
