import { Match } from '@/types/models';
import { Game, Side, SideInfo } from '@/lib/types/bracket-models';

function getBracketRoundLabel(currentRound: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - currentRound + 1
  const participants = Math.pow(2, roundsFromEnd)
  switch (participants) {
    case 256: return 'Round of 256'
    case 128: return 'Round of 128'
    case 64: return 'Round of 64'
    case 32: return 'Round of 32'
    case 16: return 'Round of 16'
    case 8: return 'Quarter-finals'
    case 4: return 'Semi-finals'
    case 2: return 'Finals'
    default: return `Round of ${participants}`
  }
}

interface Participant {
  player_id: string;
  player: {
    id?: string;
    first_name: string;
    last_name: string;
  };
  team?: {
    name: string;
  };
  disqualified?: boolean;
}

/**
 * Precomputed lookup indexes so the recursive transform runs in O(island)
 * instead of O(island²). Without these, each node did `allMatches.filter(...)`
 * and `participants.find(...)`, both O(n), per recursion step.
 */
export interface BracketIndexes {
  /** parent matchId -> child matches feeding it, pre-sorted by match_number */
  childrenByParent: Map<string, Match[]>;
  /** player_id (and player.id) -> participant */
  participantById: Map<string, Participant>;
}

export function buildBracketIndexes(
  allMatches: Match[],
  participants: Participant[]
): BracketIndexes {
  const childrenByParent = new Map<string, Match[]>();
  for (const m of allMatches) {
    if (!m.next_match_id) continue;
    const arr = childrenByParent.get(m.next_match_id);
    if (arr) arr.push(m);
    else childrenByParent.set(m.next_match_id, [m]);
  }
  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => a.match_number - b.match_number);
  }

  const participantById = new Map<string, Participant>();
  for (const p of participants) {
    if (p.player_id) participantById.set(p.player_id, p);
    if (p.player?.id) participantById.set(p.player.id, p);
  }

  return { childrenByParent, participantById };
}

/**
 * Check if a player is disqualified
 */
function isPlayerDisqualified(playerId: string | null, participantById: Map<string, Participant>): boolean {
  if (!playerId) return false;
  return !!participantById.get(playerId)?.disqualified;
}

/**
 * Calculate the number of rounds won by each player in a match
 * Best of 3 logic: check scores for round 1, 2, and 3
 */
export function calculateRoundWins(match: Match): { player1Wins: number, player2Wins: number } {
  let player1Wins = 0;
  let player2Wins = 0;

  // Round 1
  if (match.winner_round1) {
    if (match.winner_round1 === match.player1_id) player1Wins++;
    else if (match.winner_round1 === match.player2_id) player2Wins++;
  } else {
    const s1p1 = match.score_round1_player1 ?? 0
    const s1p2 = match.score_round1_player2 ?? 0
    if (s1p1 > s1p2) player1Wins++;
    else if (s1p2 > s1p1) player2Wins++;
  }

  // Round 2
  if (match.winner_round2) {
    if (match.winner_round2 === match.player1_id) player1Wins++;
    else if (match.winner_round2 === match.player2_id) player2Wins++;
  } else {
    const s2p1 = match.score_round2_player1 ?? 0
    const s2p2 = match.score_round2_player2 ?? 0
    if (s2p1 > s2p2) player1Wins++;
    else if (s2p2 > s2p1) player2Wins++;
  }

  // Round 3
  if (match.winner_round3) {
    if (match.winner_round3 === match.player1_id) player1Wins++;
    else if (match.winner_round3 === match.player2_id) player2Wins++;
  } else {
    const s3p1 = match.score_round3_player1 ?? 0
    const s3p2 = match.score_round3_player2 ?? 0
    if (s3p1 > s3p2) player1Wins++;
    else if (s3p2 > s3p1) player2Wins++;
  }

  return { player1Wins, player2Wins };
}

/**
 * Get display name for a player
 */
function getPlayerName(playerId: string | null, participantById: Map<string, Participant>, match?: Match, side?: 'player1' | 'player2'): string {
  if (!playerId) return 'BYE';

  // Try finding in participants first (better data source for teams etc)
  const participant = participantById.get(playerId);

  if (participant && participant.player) {
    return `${participant.player.first_name} ${participant.player.last_name}`;
  }

  // Fallback to match object if available
  if (match && side) {
    const playerObj = side === 'player1' ? match.player1 : match.player2;
    if (playerObj) {
      return `${playerObj.first_name} ${playerObj.last_name}`;
    }
  }

  return 'Unknown Player';
}

/**
 * Get team name for a player
 */
function getTeamName(playerId: string | null, participantById: Map<string, Participant>): string {
  if (!playerId) return '';

  const participant = participantById.get(playerId);
  if (!participant || !participant.team) return 'TBD';

  return participant.team.name;
}

/**
 * Transform a Match object into a Game object for the SVG bracket
 * This is a recursive function that builds the tree structure
 */
export function transformMatchToGame(
  match: Match,
  allMatches: Match[],
  participants: Participant[],
  roundLabel?: string,
  indexes?: BracketIndexes
): Game {
  // Build indexes once at the top-level call; recursion reuses them so the
  // whole tree is O(island) rather than O(island²).
  const idx = indexes ?? buildBracketIndexes(allMatches, participants);
  const { childrenByParent, participantById } = idx;

  const { player1Wins, player2Wins } = calculateRoundWins(match);

  // Source matches (those feeding into this one), pre-sorted Top/Bottom by match_number.
  const sortedSourceMatches = childrenByParent.get(match.id) ?? [];

  const topSourceMatch = sortedSourceMatches.length > 0 ? sortedSourceMatches[0] : null;
  const bottomSourceMatch = sortedSourceMatches.length > 1 ? sortedSourceMatches[1] : null;

  // Construct SideInfo for Home (Top)
  const homeSide: SideInfo = {
    score: {
      score: player1Wins,
      round1: match.score_round1_player1,
      round2: match.score_round2_player1,
      round3: match.score_round3_player1
    },
    seed: {
      displayName: getPlayerName(match.player1_id, participantById, match, 'player1'),
      rank: 1, // Placeholder
      sourceGame: topSourceMatch ? transformMatchToGame(topSourceMatch, allMatches, participants, undefined, idx) : null,
      sourcePool: null
    },
    team: match.player1_id ? {
      id: match.player1_id,
      name: getTeamName(match.player1_id, participantById)
    } : undefined,
    isDisqualified: isPlayerDisqualified(match.player1_id, participantById)
  };

  // Construct SideInfo for Visitor (Bottom)
  const visitorSide: SideInfo = {
    score: {
      score: player2Wins,
      round1: match.score_round1_player2,
      round2: match.score_round2_player2,
      round3: match.score_round3_player2
    },
    seed: {
      displayName: getPlayerName(match.player2_id, participantById, match, 'player2'),
      rank: 2, // Placeholder
      sourceGame: bottomSourceMatch ? transformMatchToGame(bottomSourceMatch, allMatches, participants, undefined, idx) : null,
      sourcePool: null
    },
    team: match.player2_id ? {
      id: match.player2_id,
      name: getTeamName(match.player2_id, participantById)
    } : undefined,
    isDisqualified: isPlayerDisqualified(match.player2_id, participantById)
  };

  return {
    id: match.id,
    name: match.match_number_formatted || `Match ${match.match_number}`,
    bracketLabel: roundLabel, // This will be "Finals", "Semi-Finals", etc.
    scheduled: new Date(match.created_at).getTime(),
    court: match.court_number ? {
      name: match.court_number.toString(),
      venue: { name: 'Main Venue' }
    } : undefined,
    sides: {
      [Side.HOME]: homeSide,
      [Side.VISITOR]: visitorSide
    },
    originalMatch: match
  };
}

/**
 * Group matches by division and category
 */
export function groupMatchesByDivision(matches: Match[]): Record<string, Match[]> {
  return matches.reduce((acc, match) => {
    const matchWithDivision = match as Match & { division_id?: string; category_id?: string };
    const key = `${matchWithDivision.division_id || 'no-division'}_${matchWithDivision.category_id || 'no-category'}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(match);
    return acc;
  }, {} as Record<string, Match[]>);
}

/**
 * Build the complete Game tree for a set of matches
 * Identifies the "Finals" matches (roots of the trees) and builds downwards
 */
export function buildBracketTree(matches: Match[], participants: Participant[]): Game[] {
  if (matches.length === 0) return [];

  // First group by division to ensure we don't mix brackets
  const groups = groupMatchesByDivision(matches);
  const games: Game[] = [];

  Object.values(groups).forEach(groupMatches => {
    const groupMaxRound = Math.max(...groupMatches.map(m => m.round));
    const finalsMatches = groupMatches.filter(m => m.round === groupMaxRound);

    // Build the lookup indexes once per group and reuse for every root.
    const indexes = buildBracketIndexes(groupMatches, participants);

    finalsMatches.forEach(finalMatch => {
      games.push(transformMatchToGame(
        finalMatch,
        groupMatches,
        participants,
        getBracketRoundLabel(finalMatch.round, groupMaxRound),
        indexes
      ));
    });
  });

  return games;
}
