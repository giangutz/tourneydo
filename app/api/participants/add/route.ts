/**
 * API Route: POST /api/participants/add
 *
 * Add a player to a tournament
 *
 * Security:
 * - Requires authentication (Clerk JWT)
 * - Requires authorization (user must be team owner/coach)
 * - All inputs validated with Zod
 * - No sensitive data exposed in errors
 */

import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getTeamById } from '@/lib/db/queries/teams'
import { createPlayer, updatePlayer } from '@/lib/db/queries/players'
import { addPlayerToTeam } from '@/lib/db/queries/teams'
import { createRegistration } from '@/lib/db/queries/registrations'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { revalidatePath } from 'next/cache'
import { routes } from '@/config/routes'
import { successResponse, errorResponse, ERROR_CODE, HTTP_STATUS } from '@/lib/utils/api-response'
import { addParticipantSchema } from '@/lib/validations/participants'
import { invalidateTournamentCache } from '@/lib/cache/result-cache'
import { ajStrict } from '@/lib/arcjet'
import * as Sentry from '@sentry/nextjs'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
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
        'Must be logged in to add participants',
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

    const validationResult = addParticipantSchema.safeParse(body)
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

    const {
      tournamentId,
      teamId,
      playerId,
      firstName,
      lastName,
      email,
      dob,
      gender,
      weight,
      height,
      beltLevel,
    } = validationResult.data

    // 3. AUTHORIZE & FETCH DATA IN PARALLEL
    // OPTIMIZATION: Use Promise.all for independent queries
    const [team, tournament] = await Promise.all([
      getTeamById(teamId),
      getTournamentById(tournamentId),
    ])

    if (!team) {
      return errorResponse(
        ERROR_CODE.NOT_FOUND,
        'Team not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    if (!tournament) {
      return errorResponse(
        ERROR_CODE.NOT_FOUND,
        'Tournament not found',
        HTTP_STATUS.NOT_FOUND
      )
    }

    if (team.user_id !== userId) {
      return errorResponse(
        ERROR_CODE.FORBIDDEN,
        'Not authorized to manage this team',
        HTTP_STATUS.FORBIDDEN
      )
    }

    // 3b. ENFORCE REGISTRATION DEADLINE
    if (tournament.registration_deadline) {
      const deadline = new Date(tournament.registration_deadline)
      if (new Date() > deadline) {
        return errorResponse(
          ERROR_CODE.VALIDATION_ERROR,
          `Registration deadline has passed (${deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })})`,
          HTTP_STATUS.BAD_REQUEST
        )
      }
    }

    // 4. EXECUTE BUSINESS LOGIC
    let finalPlayerId: string = playerId || ''

    try {
      if (playerId) {
        await updatePlayer(playerId, {
          first_name: firstName,
          last_name: lastName,
          email: email || null,
          dob: dob ? (dob instanceof Date ? dob.toISOString().split('T')[0] : dob) : null,
          gender: gender || null,
          weight: weight || null,
          height: height || null,
          belt_level: beltLevel,
        })
      } else {
        const player = await createPlayer({
          first_name: firstName!,
          last_name: lastName!,
          email: email || null,
          dob: dob ? (dob instanceof Date ? dob.toISOString().split('T')[0] : dob) : null,
          gender: gender || null,
          weight: weight || null,
          height: height || null,
          belt_level: beltLevel!,
          coach_id: team.user_id,
        })
        finalPlayerId = player.id
      }

      try {
        await addPlayerToTeam(team.id, finalPlayerId)
      } catch (error: unknown) {
        const err = error as { message?: string }
        if (
          !err.message?.includes('duplicate key value') &&
          !err.message?.includes('unique constraint')
        ) {
          throw error
        }
      }

      await createRegistration({
        tournament_id: tournamentId,
        team_id: team.id,
        player_id: finalPlayerId,
        coach_id: team.user_id,
        status: 'verified',
        actual_weight: weight || null,
        actual_height: height || null,
        disqualified: false,
        disqualification_reason: null,
        weighed_in_at: null,
        weighed_in_by: null,
        weigh_in_selected: false,
        random_weigh_in_weight: null,
        random_weigh_in_at: null,
        random_weigh_in_passed: null,
        random_weigh_in_by: null,
      })
    } catch (error: unknown) {
      const err = error as { message?: string }
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        return errorResponse(
          ERROR_CODE.CONFLICT,
          'Player already registered for this tournament',
          HTTP_STATUS.CONFLICT
        )
      }
      throw error
    }

    // 5. INVALIDATE CACHE AND REVALIDATE
    invalidateTournamentCache(tournamentId)
    revalidatePath(routes.organizer.tournamentParticipants(tournamentId))

    logger.info({ userId, teamId, playerId: finalPlayerId, tournamentId }, 'Participant added')

    return successResponse(
      { playerId: finalPlayerId, status: 'verified' },
      HTTP_STATUS.CREATED
    )
  } catch (error) {
    logger.error({ error: error }, 'Failed to add participant')
    Sentry.captureException(error, {
      tags: { action: 'add_participant' },
    })

    return errorResponse(
      ERROR_CODE.INTERNAL_ERROR,
      'Failed to add participant',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }
}
