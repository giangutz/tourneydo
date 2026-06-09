/**
 * API Route: GET /api/tournaments/[id]/export
 *
 * Export tournament data as CSV or PDF.
 *
 * Query params:
 *   format = "csv" | "pdf"   (required)
 *   type   = "results" | "participants"  (required)
 *
 * Security:
 *   - Requires authentication (Clerk JWT)
 *   - Requires organizer or active-staff authorization
 *   - Rate limited via ArcJet (aj, 120 req/60 s)
 */

import { type NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkTournamentAccess } from '@/lib/auth/tournament-access'
import { aj } from '@/lib/arcjet'
import { matchResultsToCsv, participantsToCsv, type MatchResultRow, type ParticipantRow } from '@/lib/export/csv-export'
import { matchResultsToPdf, participantsToPdf } from '@/lib/export/pdf-export'
import { errorResponse, HTTP_STATUS } from '@/lib/utils/api-response'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit
  const rl = await aj.protect(request)
  if (rl.isDenied()) {
    return errorResponse('TOO_MANY_REQUESTS', 'Too many requests', HTTP_STATUS.TOO_MANY_REQUESTS)
  }

  try {
    // 1. AUTHENTICATE
    const { userId } = await auth()
    if (!userId) {
      return errorResponse('UNAUTHORIZED', 'Must be logged in to export tournament data', HTTP_STATUS.UNAUTHORIZED)
    }

    const { id: tournamentId } = await params

    // 2. AUTHORIZE (organizer or any active staff may export)
    const { hasAccess } = await checkTournamentAccess(tournamentId)
    if (!hasAccess) {
      return errorResponse('FORBIDDEN', 'Not authorized to export this tournament', HTTP_STATUS.FORBIDDEN)
    }

    // 3. VALIDATE QUERY PARAMS
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')
    const type = searchParams.get('type')

    if (format !== 'csv' && format !== 'pdf') {
      return errorResponse('INVALID_INPUT', 'format must be "csv" or "pdf"', HTTP_STATUS.BAD_REQUEST)
    }
    if (type !== 'results' && type !== 'participants') {
      return errorResponse('INVALID_INPUT', 'type must be "results" or "participants"', HTTP_STATUS.BAD_REQUEST)
    }

    // 4. FETCH DATA AND GENERATE EXPORT
    const supabase = await createServerSupabaseClient()

    // Fetch tournament name for file title
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('name')
      .eq('id', tournamentId)
      .single()

    const tournamentName = tournament?.name ?? 'Tournament'
    const safeFileName = tournamentName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_')

    if (type === 'results') {
      // Fetch completed matches with round scores, players, divisions, categories
      const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select(`
          id,
          match_number,
          round,
          status,
          winner_id,
          win_method,
          winning_round,
          player1:players!matches_player1_id_fkey ( id, first_name, last_name ),
          player2:players!matches_player2_id_fkey ( id, first_name, last_name ),
          player1_team:tournament_registrations!inner ( team_id, teams ( name ) ),
          division:tournament_divisions ( name ),
          category:tournament_categories ( name ),
          match_rounds ( round_number, score_player1, score_player2 )
        `)
        .eq('tournament_id', tournamentId)
        .eq('status', 'completed')
        .order('match_number', { ascending: true })

      if (matchError) {
        logger.error({ matchError, tournamentId }, 'Export: failed to fetch matches')
        return errorResponse('INTERNAL_ERROR', 'Failed to fetch match results', HTTP_STATUS.INTERNAL_SERVER_ERROR)
      }

      // Fetch team names for players via registrations (separate join to avoid complexity)
      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select('player_id, teams ( name )')
        .eq('tournament_id', tournamentId)

      const playerTeamMap = new Map<string, string>()
      if (registrations) {
        for (const r of registrations as any[]) {
          if (r.player_id && r.teams?.name) {
            playerTeamMap.set(r.player_id, r.teams.name)
          }
        }
      }

      const rows: MatchResultRow[] = (matches ?? []).map((m: any) => {
        const rounds: Record<number, { s1: number | null; s2: number | null }> = {}
        for (const rnd of m.match_rounds ?? []) {
          rounds[rnd.round_number] = { s1: rnd.score_player1, s2: rnd.score_player2 }
        }

        const p1 = m.player1
        const p2 = m.player2
        const winnerId: string | null = m.winner_id
        const winnerIsP1 = winnerId && p1 && winnerId === p1.id
        const winnerName = winnerId
          ? winnerIsP1
            ? `${p1?.first_name ?? ''} ${p1?.last_name ?? ''}`.trim()
            : `${p2?.first_name ?? ''} ${p2?.last_name ?? ''}`.trim()
          : ''

        return {
          matchNumber: String(m.match_number ?? ''),
          round: String(m.round ?? ''),
          division: m.division?.name ?? '',
          category: m.category?.name ?? '',
          player1Name: p1 ? `${p1.first_name} ${p1.last_name}`.trim() : 'BYE',
          player1Team: p1 ? (playerTeamMap.get(p1.id) ?? '') : '',
          player2Name: p2 ? `${p2.first_name} ${p2.last_name}`.trim() : 'BYE',
          player2Team: p2 ? (playerTeamMap.get(p2.id) ?? '') : '',
          round1Score1: rounds[1]?.s1 ?? null,
          round1Score2: rounds[1]?.s2 ?? null,
          round2Score1: rounds[2]?.s1 ?? null,
          round2Score2: rounds[2]?.s2 ?? null,
          round3Score1: rounds[3]?.s1 ?? null,
          round3Score2: rounds[3]?.s2 ?? null,
          winnerName,
          winMethod: m.win_method ?? 'SCORE',
          winningRound: m.winning_round ?? null,
        }
      })

      if (format === 'csv') {
        const csv = matchResultsToCsv(rows)
        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${safeFileName}_match_results.csv"`,
          },
        })
      } else {
        const html = matchResultsToPdf(tournamentName, rows)
        return new NextResponse(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `attachment; filename="${safeFileName}_match_results.html"`,
          },
        })
      }
    }

    // type === 'participants'
    const { data: registrations, error: regError } = await supabase
      .from('tournament_registrations')
      .select(`
        status,
        actual_weight,
        players ( first_name, last_name, belt_level, date_of_birth ),
        teams ( name ),
        coach:users!tournament_registrations_coach_id_fkey ( full_name ),
        division:tournament_divisions ( name ),
        category:tournament_categories ( name )
      `)
      .eq('tournament_id', tournamentId)
      .order('status')

    if (regError) {
      logger.error({ regError, tournamentId }, 'Export: failed to fetch registrations')
      return errorResponse('INTERNAL_ERROR', 'Failed to fetch participants', HTTP_STATUS.INTERNAL_SERVER_ERROR)
    }

    const rows: ParticipantRow[] = (registrations ?? []).map((r: any) => {
      const dob: string | null = r.players?.date_of_birth ?? null
      const age = dob
        ? Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
        : null

      return {
        firstName: r.players?.first_name ?? '',
        lastName: r.players?.last_name ?? '',
        team: r.teams?.name ?? '',
        coachName: r.coach?.full_name ?? '',
        division: r.division?.name ?? '',
        category: r.category?.name ?? '',
        belt: r.players?.belt_level ?? '',
        weight: r.actual_weight ?? null,
        age,
        registrationStatus: r.status ?? '',
      }
    })

    if (format === 'csv') {
      const csv = participantsToCsv(rows)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeFileName}_participants.csv"`,
        },
      })
    } else {
      const html = participantsToPdf(tournamentName, rows)
      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${safeFileName}_participants.html"`,
        },
      })
    }
  } catch (error) {
    logger.error({ error }, 'Export route failed')
    return errorResponse('INTERNAL_ERROR', 'Export failed', HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}
