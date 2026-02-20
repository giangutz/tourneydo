
// Mock standard bracket structure (Top-to-Bottom visual)
const mockMatches = [
  { id: '1001', round: 1, next_match_id: '1005', match_number: 1 }, // Top
  { id: '1002', round: 1, next_match_id: '1005', match_number: 2 }, // Top-Mid
  { id: '1003', round: 1, next_match_id: '1006', match_number: 3 }, // Bot-Mid
  { id: '1004', round: 1, next_match_id: '1006', match_number: 4 }, // Bot (The problem child)

  { id: '1005', round: 2, next_match_id: '1007', match_number: 5 }, // Top-Semi
  { id: '1006', round: 2, next_match_id: '1007', match_number: 6 }, // Bot-Semi

  { id: '1007', round: 3, next_match_id: null, match_number: 7 },   // Final
];

// Paste the logic from regenerate-bracket-schedule.ts
function reorderMatchesByStructure(matches: any[]): any[] {
  const matchMap = new Map(matches.map(m => [m.id, m]))

  // Build adjacency list (Parent -> Children) based on `next_match_id`
  const parentToChildren = new Map<string, any[]>()
  for (const m of matches) {
    if (m.next_match_id) {
      if (!parentToChildren.has(m.next_match_id)) {
        parentToChildren.set(m.next_match_id, [])
      }
      parentToChildren.get(m.next_match_id)!.push(m)
    }
  }

  const verticalIndices = new Map<string, number>()
  let counter = 0

  // Identify Roots (matches with no next_match_id)
  const roots = matches.filter(m => !m.next_match_id || !matchMap.has(m.next_match_id))

  // Sort roots deterministically (Category > ID) -- Simplification for test
  roots.sort((a, b) => a.id.localeCompare(b.id))

  // Depth-First Traversal to assign vertical order
  function visit(m: any) {
    if (!m) return

    let children: any[] = []

    if (m.source_match_ids && Array.isArray(m.source_match_ids) && m.source_match_ids.length > 0) {
      children = m.source_match_ids.map((id: string) => matchMap.get(id)).filter(Boolean)
    }
    else if (parentToChildren.has(m.id)) {
      children = parentToChildren.get(m.id)!
      // Heuristic: Lower match number usually means "Top" or "Left"
      children.sort((a, b) => (a.match_number || 0) - (b.match_number || 0))
    }

    // Traverse Children First
    for (const child of children) {
      visit(child)
    }

    if (!verticalIndices.has(m.id)) {
      verticalIndices.set(m.id, counter++)
    }
  }

  roots.forEach(r => visit(r))

  return [...matches].sort((a, b) => {
    const idxA = verticalIndices.has(a.id) ? verticalIndices.get(a.id)! : 999999
    const idxB = verticalIndices.has(b.id) ? verticalIndices.get(b.id)! : 999999

    // Sort logic from file:
    if (a.round !== b.round) return a.round - b.round
    return idxA - idxB
  })
}

const sorted = reorderMatchesByStructure(mockMatches);

console.log('Original Order:', mockMatches.map(m => m.id));
console.log('Sorted Order:', sorted.map(m => `Match ${m.match_number} (ID: ${m.id})`));

// Check if Round 1 matches are in correct order (1, 2, 3, 4)
const r1 = sorted.filter(m => m.round === 1);
console.log('Round 1 Order:', r1.map(m => m.match_number));
