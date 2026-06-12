import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  GAM_JEOM_TYPES,
  GAM_JEOM_CATEGORY_LABELS,
  type GamJeomCategory,
} from '@/lib/constants/wt-rules'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TechniqueStats {
  punch: number
  body_kick: number
  head_kick: number
  spin_body_kick: number
  spin_head_kick: number
  total: number
  /** head_kick / total kicks (excludes punch) — 0 when no kicks recorded */
  headKickRate: number
  /** (spin_body_kick + spin_head_kick) / total kicks — 0 when no kicks recorded */
  spinKickRate: number
}

export interface PenaltyStat {
  value: string
  label: string
  category: GamJeomCategory
  categoryLabel: string
  count: number
}

export interface PenaltyStats {
  total: number
  /** Rounded to 1 decimal */
  perMatch: number
  byCategory: Record<GamJeomCategory, number>
  /** Only types with count > 0, sorted descending */
  byType: PenaltyStat[]
}

export interface MatchRecord {
  played: number
  wins: number
  losses: number
  /** Integer percentage 0–100 */
  winRate: number
}

export interface PlayerCareerStats {
  matchRecord: MatchRecord
  techniques: TechniqueStats
  penalties: PenaltyStats
  /** False when the player has no completed matches and no recorded stats */
  hasData: boolean
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export async function getPlayerCareerStats(playerId: string): Promise<PlayerCareerStats> {
  const supabase = createServerSupabaseClient()

  const [matchesRes, techniquesRes, penaltiesRes] = await Promise.all([
    supabase
      .from('matches')
      .select('id, winner_id')
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .eq('status', 'completed'),
    supabase
      .from('match_player_round_stats')
      .select('punch, body_kick, head_kick, spin_body_kick, spin_head_kick')
      .eq('player_id', playerId),
    supabase
      .from('match_gam_jeoms')
      .select('gam_jeom_type')
      .eq('player_id', playerId),
  ])

  // Match record
  const matches = matchesRes.data ?? []
  const played = matches.length
  const wins = matches.filter((m) => m.winner_id === playerId).length
  const matchRecord: MatchRecord = {
    played,
    wins,
    losses: played - wins,
    winRate: played > 0 ? Math.round((wins / played) * 100) : 0,
  }

  // Technique totals
  const techRows = techniquesRes.data ?? []
  const punch = techRows.reduce((s, r) => s + (r.punch ?? 0), 0)
  const body_kick = techRows.reduce((s, r) => s + (r.body_kick ?? 0), 0)
  const head_kick = techRows.reduce((s, r) => s + (r.head_kick ?? 0), 0)
  const spin_body_kick = techRows.reduce((s, r) => s + (r.spin_body_kick ?? 0), 0)
  const spin_head_kick = techRows.reduce((s, r) => s + (r.spin_head_kick ?? 0), 0)
  const totalKicks = body_kick + head_kick + spin_body_kick + spin_head_kick
  const total = punch + totalKicks
  const techniques: TechniqueStats = {
    punch, body_kick, head_kick, spin_body_kick, spin_head_kick, total,
    headKickRate: totalKicks > 0 ? Math.round((head_kick / totalKicks) * 100) : 0,
    spinKickRate: totalKicks > 0
      ? Math.round(((spin_body_kick + spin_head_kick) / totalKicks) * 100)
      : 0,
  }

  // Penalty breakdown
  const gamRows = penaltiesRes.data ?? []
  const countByType: Record<string, number> = {}
  for (const row of gamRows) {
    countByType[row.gam_jeom_type] = (countByType[row.gam_jeom_type] ?? 0) + 1
  }

  const byType: PenaltyStat[] = GAM_JEOM_TYPES
    .map((t) => ({
      value: t.value,
      label: t.label,
      category: t.category,
      categoryLabel: GAM_JEOM_CATEGORY_LABELS[t.category],
      count: countByType[t.value] ?? 0,
    }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)

  const byCategory: Record<GamJeomCategory, number> = {
    boundary_position: 0,
    combat_contact: 0,
    match_management: 0,
  }
  for (const t of byType) {
    byCategory[t.category] += t.count
  }

  const totalPenalties = gamRows.length
  const penalties: PenaltyStats = {
    total: totalPenalties,
    perMatch: played > 0 ? Math.round((totalPenalties / played) * 10) / 10 : 0,
    byCategory,
    byType,
  }

  return {
    matchRecord,
    techniques,
    penalties,
    hasData: played > 0 || total > 0 || totalPenalties > 0,
  }
}

export async function getPlayerTournamentStats(
  playerId: string,
  tournamentId: string
): Promise<PlayerCareerStats> {
  const supabase = createServerSupabaseClient()

  // Get match IDs for this player in this tournament first
  const { data: matchRows } = await supabase
    .from('matches')
    .select('id, winner_id')
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .eq('tournament_id', tournamentId)
    .eq('status', 'completed')

  const matches = matchRows ?? []
  const matchIds = matches.map((m) => m.id)

  const [techniquesRes, penaltiesRes] = await Promise.all([
    matchIds.length > 0
      ? supabase
          .from('match_player_round_stats')
          .select('punch, body_kick, head_kick, spin_body_kick, spin_head_kick')
          .eq('player_id', playerId)
          .in('match_id', matchIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    matchIds.length > 0
      ? supabase
          .from('match_gam_jeoms')
          .select('gam_jeom_type')
          .eq('player_id', playerId)
          .in('match_id', matchIds)
      : Promise.resolve({ data: [] as any[], error: null }),
  ])

  const played = matches.length
  const wins = matches.filter((m) => m.winner_id === playerId).length
  const matchRecord: MatchRecord = {
    played,
    wins,
    losses: played - wins,
    winRate: played > 0 ? Math.round((wins / played) * 100) : 0,
  }

  const techRows = techniquesRes.data ?? []
  const punch = techRows.reduce((s, r) => s + (r.punch ?? 0), 0)
  const body_kick = techRows.reduce((s, r) => s + (r.body_kick ?? 0), 0)
  const head_kick = techRows.reduce((s, r) => s + (r.head_kick ?? 0), 0)
  const spin_body_kick = techRows.reduce((s, r) => s + (r.spin_body_kick ?? 0), 0)
  const spin_head_kick = techRows.reduce((s, r) => s + (r.spin_head_kick ?? 0), 0)
  const totalKicks = body_kick + head_kick + spin_body_kick + spin_head_kick
  const total = punch + totalKicks
  const techniques: TechniqueStats = {
    punch, body_kick, head_kick, spin_body_kick, spin_head_kick, total,
    headKickRate: totalKicks > 0 ? Math.round((head_kick / totalKicks) * 100) : 0,
    spinKickRate: totalKicks > 0
      ? Math.round(((spin_body_kick + spin_head_kick) / totalKicks) * 100)
      : 0,
  }

  const gamRows = penaltiesRes.data ?? []
  const countByType: Record<string, number> = {}
  for (const row of gamRows) {
    countByType[row.gam_jeom_type] = (countByType[row.gam_jeom_type] ?? 0) + 1
  }

  const byType: PenaltyStat[] = GAM_JEOM_TYPES
    .map((t) => ({
      value: t.value,
      label: t.label,
      category: t.category,
      categoryLabel: GAM_JEOM_CATEGORY_LABELS[t.category],
      count: countByType[t.value] ?? 0,
    }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)

  const byCategory: Record<GamJeomCategory, number> = {
    boundary_position: 0,
    combat_contact: 0,
    match_management: 0,
  }
  for (const t of byType) {
    byCategory[t.category] += t.count
  }

  const totalPenalties = gamRows.length
  const penalties: PenaltyStats = {
    total: totalPenalties,
    perMatch: played > 0 ? Math.round((totalPenalties / played) * 10) / 10 : 0,
    byCategory,
    byType,
  }

  return {
    matchRecord,
    techniques,
    penalties,
    hasData: played > 0 || total > 0 || totalPenalties > 0,
  }
}
