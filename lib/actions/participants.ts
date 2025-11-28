'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { updateRegistrationStatus as updateRegistrationStatusQuery } from '@/lib/db/queries/registrations'
import { safeAction } from '@/lib/utils/errors'
import { routes } from '@/config/routes'
import type { ActionResult } from '@/types/api'

/**
 * Update participant registration status
 */
export async function updateParticipantStatus(
  registrationId: string,
  tournamentId: string,
  status: 'pending' | 'verified' | 'paid'
): Promise<ActionResult<void>> {
  return safeAction(async () => {
    const { userId } = await auth()

    if (!userId) {
      throw new Error('Unauthorized')
    }

    await updateRegistrationStatusQuery(registrationId, { status })

    revalidatePath(routes.organizer.tournamentDetail(tournamentId))
  })
}


