/**
 * Match DAG (Directed Acyclic Graph) Utilities
 * 
 * This module provides DAG-based operations for bracket dependency tracking.
 * Each bracket forms a DAG where matches depend on their source matches.
 */

import { Match, MatchLifecycleState } from '@/types/models'

// ============================================================================
// Types
// ============================================================================

export interface MatchNode {
  match: Match
  sourceNodes: MatchNode[]  // Upstream dependencies (0-2)
  targetNode: MatchNode | null  // Downstream match (next round)
  depth: number  // Distance from finals (finals = 0)
  bracketPath: string  // Bracket position path for ordering
}

export interface DAGValidationResult {
  isValid: boolean
  errors: DAGValidationError[]
}

export interface DAGValidationError {
  type: 'ORPHANED_MATCH' | 'CIRCULAR_DEPENDENCY' | 'MISSING_SOURCE' | 'INVALID_STRUCTURE'
  matchId: string
  message: string
}

// ============================================================================
// DAG Construction
// ============================================================================

/**
 * Builds a DAG representation of all matches in a bracket.
 * 
 * @param matches - All matches for a single bracket/category
 * @returns Map of match ID to MatchNode
 */
export function buildMatchDAG(matches: Match[]): Map<string, MatchNode> {
  const dag = new Map<string, MatchNode>()

  // First pass: create nodes for all matches
  for (const match of matches) {
    dag.set(match.id, {
      match,
      sourceNodes: [],
      targetNode: null,
      depth: 0,
      bracketPath: ''
    })
  }

  // Second pass: link source and target nodes
  for (const match of matches) {
    const node = dag.get(match.id)!

    // Link source matches (matches that feed into this one)
    if (match.source_match_ids && match.source_match_ids.length > 0) {
      for (const sourceId of match.source_match_ids) {
        const sourceNode = dag.get(sourceId)
        if (sourceNode) {
          node.sourceNodes.push(sourceNode)
        }
      }
    }

    // Link target match (the match this one feeds into)
    if (match.next_match_id) {
      const targetNode = dag.get(match.next_match_id)
      if (targetNode) {
        node.targetNode = targetNode
      }
    }
  }

  // Third pass: calculate depths (distance from finals)
  calculateDepths(dag)

  // Fourth pass: calculate bracket paths for ordering
  calculateBracketPaths(dag)

  return dag
}

/**
 * Calculate depth for each node (distance from finals).
 * Finals = 0, Semi-finals = 1, Quarter-finals = 2, etc.
 */
function calculateDepths(dag: Map<string, MatchNode>): void {
  // Find finals (nodes with no target)
  const finals = Array.from(dag.values()).filter((node) => node.targetNode === null)

  for (const final of finals) {
    final.depth = 0
    propagateDepth(final, 0)
  }
}

function propagateDepth(node: MatchNode, depth: number): void {
  for (const source of node.sourceNodes) {
    source.depth = depth + 1
    propagateDepth(source, depth + 1)
  }
}

/**
 * Calculate bracket paths for deterministic ordering.
 * Path encodes the position in the bracket tree.
 */
function calculateBracketPaths(dag: Map<string, MatchNode>): void {
  // Find finals
  const finals = Array.from(dag.values()).filter((node) => node.targetNode === null)

  for (const final of finals) {
    final.bracketPath = 'F'
    propagatePaths(final)
  }
}

function propagatePaths(node: MatchNode): void {
  node.sourceNodes.forEach((source, index) => {
    // Path encodes: parent path + position (0 = top, 1 = bottom)
    source.bracketPath = `${node.bracketPath}${index}`
    propagatePaths(source)
  })
}

// ============================================================================
// DAG Queries
// ============================================================================

/**
 * Get all matches that are ready to be scheduled/called.
 * A match is ready when all its source matches are complete.
 */
export function getReadyMatches(dag: Map<string, MatchNode>): Match[] {
  const ready: Match[] = []

  for (const node of dag.values()) {
    // Skip already completed or auto-advanced matches
    if (
      node.match.lifecycle_state === 'COMPLETED' ||
      node.match.lifecycle_state === 'AUTO_ADVANCE'
    ) {
      continue
    }

    // Check if all sources are complete
    const allSourcesComplete = node.sourceNodes.every(
      (source) =>
        source.match.lifecycle_state === 'COMPLETED' ||
        source.match.lifecycle_state === 'AUTO_ADVANCE'
    )

    if (allSourcesComplete && node.sourceNodes.length > 0) {
      ready.push(node.match)
    } else if (node.sourceNodes.length === 0 && node.match.lifecycle_state === 'CONTEST') {
      // Round 1 matches with no sources
      ready.push(node.match)
    }
  }

  return ready
}

/**
 * Get all matches at a specific depth (round level).
 */
export function getMatchesAtDepth(dag: Map<string, MatchNode>, depth: number): Match[] {
  return Array.from(dag.values())
    .filter((node) => node.depth === depth)
    .map((node) => node.match)
}

/**
 * Get the critical path to finals for a match.
 * Returns all matches that must complete before this match can reach finals.
 */
export function getCriticalPath(matchId: string, dag: Map<string, MatchNode>): Match[] {
  const path: Match[] = []
  let current = dag.get(matchId)

  while (current) {
    path.push(current.match)
    current = current.targetNode ?? undefined
  }

  return path
}

/**
 * Count how many matches remain before finals for a given match.
 */
export function getMatchesToFinals(matchId: string, dag: Map<string, MatchNode>): number {
  const node = dag.get(matchId)
  return node ? node.depth : 0
}

// ============================================================================
// DAG Validation
// ============================================================================

/**
 * Validates the integrity of a match DAG.
 */
export function validateDAGIntegrity(matches: Match[]): DAGValidationResult {
  const errors: DAGValidationError[] = []
  const dag = buildMatchDAG(matches)

  // Check 1: No orphaned matches (every non-final match should have a target)
  for (const node of dag.values()) {
    // Skip finals
    if (node.depth === 0) continue

    // Non-finals should have a target
    if (!node.targetNode && node.sourceNodes.length > 0) {
      // This might be a separate bracket (OK) or a broken link (error)
      // Check if this node's match has a next_match_id that doesn't exist
      if (node.match.next_match_id && !dag.has(node.match.next_match_id)) {
        errors.push({
          type: 'MISSING_SOURCE',
          matchId: node.match.id,
          message: `Match references non-existent next_match_id: ${node.match.next_match_id}`
        })
      }
    }
  }

  // Check 2: Circular dependencies
  for (const node of dag.values()) {
    if (hasCircularDependency(node, new Set())) {
      errors.push({
        type: 'CIRCULAR_DEPENDENCY',
        matchId: node.match.id,
        message: 'Circular dependency detected in match DAG'
      })
    }
  }

  // Check 3: Missing source references
  for (const match of matches) {
    if (match.source_match_ids) {
      for (const sourceId of match.source_match_ids) {
        if (!dag.has(sourceId)) {
          errors.push({
            type: 'MISSING_SOURCE',
            matchId: match.id,
            message: `Match references non-existent source match: ${sourceId}`
          })
        }
      }
    }
  }

  // Check 4: Structure validation (each non-round-1 match should have 1-2 sources)
  for (const node of dag.values()) {
    if (node.match.round > 1 && node.sourceNodes.length === 0) {
      // This match is in round > 1 but has no sources
      // Check if source_match_ids just hasn't been populated
      if (!node.match.source_match_ids || node.match.source_match_ids.length === 0) {
        errors.push({
          type: 'INVALID_STRUCTURE',
          matchId: node.match.id,
          message: `Round ${node.match.round} match has no source matches defined`
        })
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

function hasCircularDependency(node: MatchNode, visited: Set<string>): boolean {
  if (visited.has(node.match.id)) {
    return true
  }

  visited.add(node.match.id)

  for (const source of node.sourceNodes) {
    if (hasCircularDependency(source, new Set(visited))) {
      return true
    }
  }

  return false
}

// ============================================================================
// Ordering Utilities
// ============================================================================

/**
 * Sort matches in dependency-safe order for scheduling.
 * Guarantees that source matches appear before their targets.
 */
export function topologicalSort(matches: Match[]): Match[] {
  const dag = buildMatchDAG(matches)
  const sorted: Match[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  function visit(node: MatchNode): void {
    if (visited.has(node.match.id)) return
    if (visiting.has(node.match.id)) {
      throw new Error('Circular dependency detected during sort')
    }

    visiting.add(node.match.id)

    // Visit sources first (they must come before this match)
    for (const source of node.sourceNodes) {
      visit(source)
    }

    visiting.delete(node.match.id)
    visited.add(node.match.id)
    sorted.push(node.match)
  }

  // Start from finals and work backwards
  const finals = Array.from(dag.values()).filter((n) => n.targetNode === null)
  for (const final of finals) {
    visit(final)
  }

  // Catch any disconnected matches
  for (const node of dag.values()) {
    if (!visited.has(node.match.id)) {
      visit(node)
    }
  }

  return sorted
}

/**
 * Get matches grouped by depth (round level).
 * Useful for round-by-round scheduling.
 */
export function groupByDepth(matches: Match[]): Map<number, Match[]> {
  const dag = buildMatchDAG(matches)
  const groups = new Map<number, Match[]>()

  for (const node of dag.values()) {
    const depth = node.depth
    if (!groups.has(depth)) {
      groups.set(depth, [])
    }
    groups.get(depth)!.push(node.match)
  }

  return groups
}
