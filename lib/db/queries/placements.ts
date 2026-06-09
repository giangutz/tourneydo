import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export type Medal = 'gold' | 'silver' | 'bronze'

export interface Placement {
  id: string
  tournament_id: string
  division_id: string | null
  category_id: string | null
  player_id: string
  placement: 1 | 2 | 3
  medal: Medal
  computed_at: string
  // Joined fields
  player_first_name: string
  player_last_name: string
  division_name: string | null
  category_name: string | null
}

/** Group label used to bucket placements for display */
export interface PlacementGroup {
  divisionId: string | null
  categoryId: string | null
  label: string
  gold: Placement[]
  silver: Placement[]
  bronze: Placement[]
}

/**
 * Compute and persist gold/silver/bronze placements for the division/category
 * whose final match just completed.
 *
 * - Gold:   winner of the final
 * - Silver: loser of the final
 * - Bronze: losers of the semi-finals (both receive bronze per WT rules —
 *           no 3rd-place match is held)
 *
 * Existing placements for this division are deleted and replaced atomically
 * so the table stays correct after a rescore.
 *
 * Safe to call multiple times (idempotent).
 */
export async function computeDivisionPlacements(
  supabase: SupabaseClient,
  finalMatchId: string,
): Promise<void> {
  // Fetch the final match
  const { data: final, error: finalErr } = await supabase
    .from('matches')
    .select('id, player1_id, player2_id, winner_id, tournament_id, division_id, category_id, source_match_ids')
    .eq('id', finalMatchId)
    .single()

  if (finalErr || !final) {
    logger.error({ finalMatchId, error: finalErr }, 'computeDivisionPlacements: final match not found')
    return
  }

  if (!final.winner_id) return // match not yet decided

  const { tournament_id, division_id, category_id, winner_id, player1_id, player2_id } = final as any

  const placements: Array<{
    tournament_id: string; division_id: string | null; category_id: string | null
    player_id: string; placement: number; medal: string
  }> = []

  // 1 — Gold
  placements.push({ tournament_id, division_id, category_id, player_id: winner_id, placement: 1, medal: 'gold' })

  // 2 — Silver (the other finalist)
  const silverId = player1_id === winner_id ? player2_id : player1_id
  if (silverId) {
    placements.push({ tournament_id, division_id, category_id, player_id: silverId, placement: 2, medal: 'silver' })
  }

  // 3 — Bronze (losers of semi-finals — both receive bronze in WT TKD)
  const sourceIds: string[] = (final as any).source_match_ids ?? []
  if (sourceIds.length > 0) {
    const { data: semis } = await supabase
      .from('matches')
      .select('player1_id, player2_id, winner_id')
      .in('id', sourceIds)

    for (const semi of semis ?? []) {
      if (!semi.winner_id) continue
      const bronzeId = semi.player1_id === semi.winner_id ? semi.player2_id : semi.player1_id
      if (bronzeId) {
        placements.push({ tournament_id, division_id, category_id, player_id: bronzeId, placement: 3, medal: 'bronze' })
      }
    }
  }

  // Delete + re-insert so a rescore always produces correct output.
  // Supabase builder is immutable — each call returns a new instance.
  let deleteQ = supabase
    .from('tournament_placements')
    .delete()
    .eq('tournament_id', tournament_id)

  deleteQ = division_id ? (deleteQ as any).eq('division_id', division_id) : (deleteQ as any).is('division_id', null)
  deleteQ = category_id ? (deleteQ as any).eq('category_id', category_id) : (deleteQ as any).is('category_id', null)

  await deleteQ

  const { error: insertErr } = await supabase
    .from('tournament_placements')
    .insert(placements)

  if (insertErr) {
    logger.error({ finalMatchId, error: insertErr }, 'computeDivisionPlacements: failed to insert placements')
  }
}

/** Fetch all placements for a tournament, joined with player and division names. */
export async function getTournamentPlacements(tournamentId: string): Promise<PlacementGroup[]> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('tournament_placements')
    .select(`
      id, tournament_id, division_id, category_id, player_id, placement, medal, computed_at,
      players ( first_name, last_name ),
      tournament_divisions ( name ),
      tournament_categories ( name )
    `)
    .eq('tournament_id', tournamentId)
    .order('division_id', { nullsFirst: true })
    .order('category_id', { nullsFirst: true })
    .order('placement')

  if (error || !data) return []

  // Shape into display rows
  const rows: Placement[] = data.map((r: any) => ({
    id: r.id,
    tournament_id: r.tournament_id,
    division_id: r.division_id,
    category_id: r.category_id,
    player_id: r.player_id,
    placement: r.placement,
    medal: r.medal,
    computed_at: r.computed_at,
    player_first_name: r.players?.first_name ?? '',
    player_last_name: r.players?.last_name ?? '',
    division_name: r.tournament_divisions?.name ?? null,
    category_name: r.tournament_categories?.name ?? null,
  }))

  // Group by division + category
  const groupMap = new Map<string, PlacementGroup>()
  for (const row of rows) {
    const key = `${row.division_id ?? '_'}|${row.category_id ?? '_'}`
    if (!groupMap.has(key)) {
      const parts = [row.division_name, row.category_name].filter(Boolean)
      groupMap.set(key, {
        divisionId: row.division_id,
        categoryId: row.category_id,
        label: parts.join(' — ') || 'General',
        gold: [],
        silver: [],
        bronze: [],
      })
    }
    const group = groupMap.get(key)!
    if (row.medal === 'gold') group.gold.push(row)
    else if (row.medal === 'silver') group.silver.push(row)
    else group.bronze.push(row)
  }

  return Array.from(groupMap.values())
}
