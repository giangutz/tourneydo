/**
 * WT-Standard Match Numbering
 * 
 * Format: [Court][Sequence] (e.g., 101 = Court 1, Match 1; 312 = Court 3, Match 12)
 * 
 * Rules:
 * - Hundreds digit = court number
 * - Tens/ones digits = sequence on that court
 * - Match numbers are assigned once, never change during live operation
 * - Match number = relative position, not schedulability
 */

export interface ParsedMatchNumber {
  court: number
  sequence: number
  formatted: string
}

export interface MatchNumberingOptions {
  /** Optional prefix (e.g., 'M' for legacy display). Default: none */
  prefix?: string
  /** Maximum courts supported. Default: 9 */
  maxCourts?: number
}

/**
 * Format a match number in WT standard: CourtSequence (e.g., 101, 312)
 * 
 * @param court - Court number (1-9 for single digit, can be higher)
 * @param sequence - Match sequence on this court (1-99 typically)
 * @param options - Optional formatting options
 * @returns Formatted match number string
 */
export function formatMatchNumber(
  court: number,
  sequence: number,
  options?: MatchNumberingOptions
): string {
  const prefix = options?.prefix ?? ''

  // Validate court number
  if (court < 1) {
    throw new Error('Court number must be at least 1')
  }

  // Format sequence with padding
  // For sequences > 99, we don't pad (becomes 3 digits: 1100 = court 1, seq 100)
  const seqStr = sequence < 100
    ? sequence.toString().padStart(2, '0')
    : sequence.toString()

  return `${prefix}${court}${seqStr}`
}

/**
 * Parse a match number string back into court and sequence components.
 * Supports both prefixed (M101) and non-prefixed (101) formats.
 * 
 * @param matchNumber - The match number string to parse
 * @returns Parsed components with court, sequence, and original formatted string
 */
export function parseMatchNumber(matchNumber: string): ParsedMatchNumber {
  // Strip common prefixes
  const stripped = matchNumber.replace(/^M/i, '')

  // For numbers like 101, 312, 1100:
  // - Last 2 digits are sequence (unless total is 3 digits with seq >= 100)
  // - Remaining digits are court

  if (stripped.length < 2) {
    throw new Error('Invalid match number format. Minimum 2 digits required.')
  }

  // Standard case: court is everything except last 2 digits
  // e.g., 101 -> court 1, seq 01
  // e.g., 312 -> court 3, seq 12  
  // e.g., 1205 -> court 12, seq 05
  const sequenceStr = stripped.slice(-2)
  const courtStr = stripped.slice(0, -2)

  const court = parseInt(courtStr || '1', 10) // Default to court 1 if only 2 digits
  const sequence = parseInt(sequenceStr, 10)

  if (isNaN(court) || isNaN(sequence)) {
    throw new Error(`Invalid match number format: ${matchNumber}`)
  }

  return {
    court: court || 1,
    sequence,
    formatted: matchNumber
  }
}

/**
 * Generate the next match number for a court.
 * 
 * @param court - Court number
 * @param currentMaxSequence - Current highest sequence on this court
 * @param options - Optional formatting options
 * @returns The next match number string
 */
export function getNextMatchNumber(
  court: number,
  currentMaxSequence: number,
  options?: MatchNumberingOptions
): string {
  return formatMatchNumber(court, currentMaxSequence + 1, options)
}

/**
 * Compare two match numbers for sorting.
 * Sorts by court first, then by sequence.
 * 
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function compareMatchNumbers(a: string, b: string): number {
  const parsedA = parseMatchNumber(a)
  const parsedB = parseMatchNumber(b)

  // Primary: court number
  if (parsedA.court !== parsedB.court) {
    return parsedA.court - parsedB.court
  }

  // Secondary: sequence
  return parsedA.sequence - parsedB.sequence
}

/**
 * Check if a match number is valid.
 */
export function isValidMatchNumber(matchNumber: string): boolean {
  try {
    parseMatchNumber(matchNumber)
    return true
  } catch {
    return false
  }
}

