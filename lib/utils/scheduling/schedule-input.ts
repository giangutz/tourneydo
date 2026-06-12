/**
 * Shared scheduler-input construction.
 *
 * Both the real schedule commit (regenerateBracketSchedule) and the dry-run
 * preview (previewSchedule) must feed the scheduler exactly the same input so
 * the preview is a faithful representation of what will be committed. This
 * module centralises the two pieces that were previously inlined in the commit
 * action: structural match ordering and the scheduler-input mapping.
 */

import { Match } from '@/types/models'
import { ScheduleInput } from '@/lib/utils/match-scheduler'

/**
 * Reorder matches into top-to-bottom visual bracket order.
 *
 * Fast path: when every match has a structural_match_number (newly generated
 * brackets) sort by round then structural number. Otherwise fall back to a DFS
 * over next_match_id / source_match_ids for legacy data.
 */
export function reorderMatchesByStructure(matches: Match[]): Match[] {
  const allHaveStructural = matches.every(
    (m) => m.structural_match_number != null && m.structural_match_number > 0
  )

  if (allHaveStructural) {
    return [...matches].sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round
      return (a.structural_match_number ?? 0) - (b.structural_match_number ?? 0)
    })
  }

  const matchMap = new Map(matches.map((m) => [m.id, m]))

  // Build adjacency list (Parent -> Children) based on `next_match_id`.
  const parentToChildren = new Map<string, Match[]>()
  for (const m of matches) {
    if (m.next_match_id) {
      if (!parentToChildren.has(m.next_match_id)) parentToChildren.set(m.next_match_id, [])
      parentToChildren.get(m.next_match_id)!.push(m)
    }
  }

  const verticalIndices = new Map<string, number>()
  let counter = 0

  // Roots = matches with no next_match_id (the finals of each bracket).
  const roots = matches.filter((m) => !m.next_match_id || !matchMap.has(m.next_match_id))

  roots.sort((a, b) => {
    const catA = (a.tournament_categories?.name || '') + (a.tournament_divisions?.name || '')
    const catB = (b.tournament_categories?.name || '') + (b.tournament_divisions?.name || '')
    if (catA !== catB) return catA.localeCompare(catB)
    return a.id.localeCompare(b.id)
  })

  function visit(m: Match | undefined) {
    if (!m) return

    let children: Match[] = []
    if (m.source_match_ids && Array.isArray(m.source_match_ids) && m.source_match_ids.length > 0) {
      children = m.source_match_ids
        .map((id) => matchMap.get(id))
        .filter((x): x is Match => x !== undefined)
    } else if (parentToChildren.has(m.id)) {
      children = parentToChildren.get(m.id)!
      children.sort((a, b) => (a.match_number || 0) - (b.match_number || 0))
    }

    for (const child of children) visit(child)

    if (!verticalIndices.has(m.id)) verticalIndices.set(m.id, counter++)
  }

  roots.forEach((r) => visit(r))

  return [...matches].sort((a, b) => {
    const idxA = verticalIndices.has(a.id) ? verticalIndices.get(a.id)! : 999999
    const idxB = verticalIndices.has(b.id) ? verticalIndices.get(b.id)! : 999999
    if (a.round !== b.round) return a.round - b.round
    return idxA - idxB
  })
}

/**
 * Map enriched Match rows into the scheduler's input shape. Used for both the
 * feasibility check and the assignment pass so they never diverge.
 */
export function buildSchedulerMatchInput(matches: Match[]): ScheduleInput['matches'] {
  return matches.map((m) => ({
    id: m.id!,
    divisionId: m.division_id!,
    categoryId: m.category_id!,
    round: m.round,
    status: m.status,
    winner_id: m.winner_id,
    next_match_id: m.next_match_id, // Critical for dependencies
    belt_level: m.player1?.belt_level ?? m.player2?.belt_level ?? undefined,
    division_name: m.tournament_divisions?.name,
    category_name: m.tournament_categories?.name,
    gender: m.tournament_categories?.gender,
    round_name: m.round_name,
    round_order: m.round_order,
    structural_match_number: m.structural_match_number,
    bracket_position: m.bracket_position,
    lifecycle_state: m.lifecycle_state,
  }))
}
