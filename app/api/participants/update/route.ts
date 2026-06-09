/**
 * API Route: PUT /api/participants/update
 *
 * Update a participant's information in a tournament
 *
 * Security:
 * - Requires authentication (Clerk JWT)
 * - Requires authorization (user must be team owner/coach)
 * - All inputs validated with Zod
 * - No sensitive data exposed in errors
 */

import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { updatePlayer, getPlayerById } from '@/lib/db/queries/players'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getTeamById } from '@/lib/db/queries/teams'
import { revalidatePath } from 'next/cache'
import { routes } from '@/config/routes'
import { successResponse, errorResponse, ERROR_CODE, HTTP_STATUS } from '@/lib/utils/api-response'
import { updateParticipantSchema } from '@/lib/validations/participants'
import { ajStrict } from '@/lib/arcjet'
import * as Sentry from '@sentry/nextjs'
import { logger } from '@/lib/logger'

export async function PUT(request: NextRequest) {
  // Rate limit: 60 requests / 60 s per IP
  const rl = await ajStrict.protect(request)
  if (rl.isDenied()) {
    return errorResponse(ERROR_CODE.TOO_MANY_REQUESTS, 'Too many requests. Please try again later.', HTTP_STATUS.TOO_MANY_REQUESTS)
  }

  try {
    // 1. AUTHENTICATE
    const { userId } = await auth()
    if (!userId) {
      return errorResponse(
        ERROR_CODE.UNAUTHORIZED,
        'Must be logged in to update participants',
        HTTP_STATUS.UNAUTHORIZED
      )
    }

    // 2. VALIDATE INPUT
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(
        ERROR_CODE.INVALID_INPUT,
        'Invalid JSON in request body',
        HTTP_STATUS.BAD_REQUEST
      )
    }

    const validationResult = updateParticipantSchema.safeParse(body)
    if (!validationResult.success) {
      const details: Record<string, string> = {}
      for (const error of validationResult.error.issues) {
        const path = error.path.join('.')
        details[path] = error.message
      }
      return errorResponse(
        ERROR_CODE.VALIDATION_ERROR,
        'Validation failed',
        HTTP_STATUS.BAD_REQUEST,
        details
      )
    }

    const { registrationId, status, actualWeight, actualHeight, beltLevel } = validationResult.data

    // 3. AUTHORIZE - Verify user access
    const supabase = await createServerSupabaseClient()

    // Get registration and verify user owns the team
    const { data: registration, error: regError } = await supabase
      .from('tournament_registrations')
      .select('player_id, team_id, tournament_id')
      .eq('id', registrationId)
      .single()

    if (regError || !registration) {
      return errorResponse(
        ERROR_CODE.NOT_FOUND,
        'Registration not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    // Verify user owns the team
    const team = await getTeamById(registration.team_id)
    if (!team || team.user_id !== userId) {
      return errorResponse(
        ERROR_CODE.FORBIDDEN,
        'Not authorized to manage this registration',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // 4. EXECUTE BUSINESS LOGIC
    try {
      if (beltLevel) {
        const player = await getPlayerById(registration.player_id)
        if (player) {
          await updatePlayer(registration.player_id, {
            ...player,
            belt_level: beltLevel,
          })
        }
      }

      const updateData: Record<string, unknown> = {}
      if (status) updateData.status = status
      if (actualWeight !== undefined) updateData.actual_weight = actualWeight
      if (actualHeight !== undefined) updateData.actual_height = actualHeight
      if (actualWeight || actualHeight) {
        updateData.weighed_in_at = new Date().toISOString()
      }

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('tournament_registrations')
          .update(updateData)
          .eq('id', registrationId)
      }
    } catch (error: unknown) {
      throw error
    }

    logger.info({ userId, registrationId, status }, 'Participant updated')

    revalidatePath(routes.organizer.tournamentParticipants(registration.tournament_id))

    return successResponse({ success: true }, HTTP_STATUS.OK)
  } catch (error) {
    logger.error({ error: error }, 'Failed to update participant')
    Sentry.captureException(error, {
      tags: { action: 'update_participant' },
    })

    return errorResponse(
      ERROR_CODE.INTERNAL_ERROR,
      'Failed to update participant',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}
