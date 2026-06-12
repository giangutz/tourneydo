/**
 * Map persisted, scheduled match rows into the timeline row shape consumed by
 * <ScheduleTimeline>. This powers the *live* schedule view (already committed),
 * mirroring the dry-run preview action so both render through the same Gantt.
 *
 * Minute-of-day is derived with Date#getHours, matching how the scheduler wrote
 * the timestamps (Date#setHours), so the round trip is consistent. Intended to
 * run server-side (same timezone that generated the schedule).
 */

import { getBeltSkillCategory } from '@/lib/utils'
import type { SchedulePreviewMatch } from '@/lib/actions/preview-schedule.types'

interface TimelinePlayer {
  id?: string
  first_name?: string
  last_name?: string
  belt_level?: string | null
}

export interface LiveTimelineMatchInput {
  id?: string
  match_number?: number | null
  match_number_formatted?: string | null
  court_number: number | null
  day_number?: number | null
  scheduled_start_time: string | null
  scheduled_end_time: string | null
  player1_id: string | null
  player2_id: string | null
  player1?: TimelinePlayer | null
  player2?: TimelinePlayer | null
  tournament_divisions?: { name?: string } | null
  tournament_categories?: { name?: string } | null
  round_name?: string | null
}

function minuteOfDay(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

function displayName(player: TimelinePlayer | null | undefined, playerId: string | null): string {
  if (!playerId) return 'BYE'
  if (player && (player.first_name || player.last_name)) {
    return `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim()
  }
  return 'TBD'
}

/**
 * Build timeline rows from persisted matches. Rows without a court or a
 * scheduled time window are skipped (not yet placed on the schedule).
 */
export function buildLiveTimelineMatches(
  matches: LiveTimelineMatchInput[]
): SchedulePreviewMatch[] {
  const rows: SchedulePreviewMatch[] = []

  for (const m of matches) {
    if (!m.id) continue
    if (!m.scheduled_start_time || !m.scheduled_end_time || m.court_number == null) continue

    const belt = m.player1?.belt_level ?? m.player2?.belt_level ?? null

    rows.push({
      matchId: m.id,
      matchNumber: m.match_number_formatted ?? (m.match_number != null ? String(m.match_number) : ''),
      day: m.day_number ?? 1,
      court: m.court_number,
      startMin: minuteOfDay(m.scheduled_start_time),
      endMin: minuteOfDay(m.scheduled_end_time),
      player1Name: displayName(m.player1, m.player1_id),
      player2Name: displayName(m.player2, m.player2_id),
      divisionName: m.tournament_divisions?.name ?? '',
      categoryName: m.tournament_categories?.name ?? '',
      roundName: m.round_name ?? '',
      skillCategory: getBeltSkillCategory(belt),
    })
  }

  return rows
}
