/**
 * Get proper bracket round label based on participant count
 * Examples: "Finals", "Semi-Finals", "Quarter-Finals", "Round of 16", etc.
 */
export function getBracketRoundLabel(
  currentRound: number,
  totalRounds: number
): string {
  const roundsFromEnd = totalRounds - currentRound + 1

  if (roundsFromEnd === 1) return 'Finals'
  if (roundsFromEnd === 2) return 'Semi-Finals'
  if (roundsFromEnd === 3) return 'Quarter-Finals'

  // Calculate participants in this round (power of 2)
  const participantsInRound = Math.pow(2, roundsFromEnd)
  return `Round of ${participantsInRound}`
}
