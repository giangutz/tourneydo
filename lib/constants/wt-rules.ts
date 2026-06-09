/**
 * World Taekwondo (WT) Kyorugi rule configuration.
 *
 * This is a RESULT-RECORDER, not a live scoring engine: matches are scored on
 * court hardware and staff transcribe the final result from the match slip.
 * The values here are used for VALIDATION and DISPLAY only (e.g. flagging an
 * impossible result, labelling win methods, grouping gam-jeoms for stats) —
 * the app never computes a live score from individual techniques.
 *
 * WT revises competition rules each cycle, so everything that can change is
 * centralised here. A future enhancement can layer a per-tournament override
 * on top of these defaults (see plan §A) without touching call sites.
 */

import type { WinMethod } from '@/types/models'

// ---------------------------------------------------------------------------
// Win methods (WT)
// ---------------------------------------------------------------------------

/**
 * Full WT win-method set plus the legacy generic values (kept for back-compat
 * with matches recorded before the WT extension). Stored on `matches.win_method`.
 */
export const WT_WIN_METHODS = [
  'PTF', // Win by final score
  'PTG', // Win by point gap
  'GDP', // Win by golden point
  'SUP', // Win by superiority (tie-break decision)
  'RSC', // Referee stops contest
  'WDR', // Win by withdrawal
  'DSQ', // Win by disqualification
  'PUN', // Win by punitive declaration (opponent hit the gam-jeom limit)
] as const

/** Legacy values retained so historical matches still validate/display. */
export const LEGACY_WIN_METHODS = [
  'SCORE',
  'KO',
  'TKO',
  'DQ',
  'WITHDRAWAL',
  'FORFEIT',
] as const

export const ALL_WIN_METHODS = [...WT_WIN_METHODS, ...LEGACY_WIN_METHODS] as const

export type WtWinMethod = (typeof WT_WIN_METHODS)[number]
/** Canonical union lives in types/models.ts; re-exported here for convenience. */
export type AnyWinMethod = WinMethod

/** Human-readable labels for every win method. */
export const WIN_METHOD_LABELS: Record<WinMethod, string> = {
  PTF: 'Final score (PTF)',
  PTG: 'Point gap (PTG)',
  GDP: 'Golden point (GDP)',
  SUP: 'Superiority (SUP)',
  RSC: 'Referee stops contest (RSC)',
  WDR: 'Withdrawal (WDR)',
  DSQ: 'Disqualification (DSQ)',
  PUN: 'Punitive declaration (PUN)',
  // legacy
  SCORE: 'Score (legacy)',
  KO: 'Knock-out (legacy)',
  TKO: 'Technical knock-out (legacy)',
  DQ: 'Disqualification (legacy)',
  WITHDRAWAL: 'Withdrawal (legacy)',
  FORFEIT: 'Forfeit (legacy)',
}

/**
 * Win methods where the winner is supplied explicitly (early termination), as
 * opposed to being derived by counting round wins. PTF/PTG/GDP/SUP all resolve
 * through the per-round winner_ids (incl. manual tie-break overrides and the
 * gam-jeom round-loss rule), so they are NOT explicit.
 */
export const EXPLICIT_WINNER_METHODS: readonly AnyWinMethod[] = [
  'RSC', 'WDR', 'DSQ', 'PUN',
  // legacy explicit-winner methods
  'KO', 'TKO', 'DQ', 'WITHDRAWAL', 'FORFEIT',
]

export function isExplicitWinnerMethod(method: string): boolean {
  return (EXPLICIT_WINNER_METHODS as readonly string[]).includes(method)
}

// ---------------------------------------------------------------------------
// Gam-jeom (penalty) taxonomy
// ---------------------------------------------------------------------------

export type GamJeomCategory =
  | 'boundary_position'
  | 'combat_contact'
  | 'match_management'

export interface GamJeomType {
  /** Stable machine value stored in match_gam_jeoms.gam_jeom_type */
  value: string
  label: string
  category: GamJeomCategory
}

export const GAM_JEOM_CATEGORY_LABELS: Record<GamJeomCategory, string> = {
  boundary_position: 'Boundary & Position',
  combat_contact: 'Combat & Contact',
  match_management: 'Match Management & Misconduct',
}

/**
 * The WT gam-jeom taxonomy. Each gam-jeom awards +1 point to the opponent;
 * reaching {@link GAM_JEOM_ROUND_LOSS_LIMIT} in a single round loses that round.
 * Stored as the `value` (TEXT) and validated app-side against this list, so the
 * taxonomy can change with the rules without a DB migration.
 */
export const GAM_JEOM_TYPES: readonly GamJeomType[] = [
  // Boundary & Position
  { value: 'crossing_boundary', label: 'Crossing the boundary line', category: 'boundary_position' },
  { value: 'falling_down', label: 'Falling down', category: 'boundary_position' },
  { value: 'lifting_leg', label: 'Lifting the leg (to block/impede)', category: 'boundary_position' },
  // Combat & Contact fouls
  { value: 'attack_below_waist', label: 'Attacking below the waist', category: 'combat_contact' },
  { value: 'using_knee', label: 'Using the knee', category: 'combat_contact' },
  { value: 'hitting_head_with_hand', label: 'Hitting the head with the hand', category: 'combat_contact' },
  { value: 'attack_after_kalyeo', label: 'Attacking after Kalyeo (break)', category: 'combat_contact' },
  { value: 'attack_fallen_opponent', label: 'Attacking a fallen opponent', category: 'combat_contact' },
  { value: 'grabbing_pushing', label: 'Grabbing or pushing', category: 'combat_contact' },
  // Match management & Misconduct
  { value: 'passivity', label: 'Passivity (avoiding/delaying)', category: 'match_management' },
  { value: 'misconduct', label: 'Misconduct (competitor or coach)', category: 'match_management' },
]

export const GAM_JEOM_TYPE_VALUES: readonly string[] = GAM_JEOM_TYPES.map((g) => g.value)

export function getGamJeomType(value: string): GamJeomType | undefined {
  return GAM_JEOM_TYPES.find((g) => g.value === value)
}

export function isValidGamJeomType(value: string): boolean {
  return GAM_JEOM_TYPE_VALUES.includes(value)
}

// ---------------------------------------------------------------------------
// Technique types (for player statistics — reference point values only)
// ---------------------------------------------------------------------------

export type TechniqueKey =
  | 'punch'
  | 'body_kick'
  | 'head_kick'
  | 'spin_body_kick'
  | 'spin_head_kick'

export interface TechniqueDef {
  key: TechniqueKey
  label: string
  /** Reference point value (validation/display only — NOT a live scoring engine). */
  points: number
}

export const TECHNIQUES: readonly TechniqueDef[] = [
  { key: 'punch', label: 'Punch (trunk)', points: 1 },
  { key: 'body_kick', label: 'Kick (trunk)', points: 2 },
  { key: 'head_kick', label: 'Kick (head)', points: 3 },
  { key: 'spin_body_kick', label: 'Turning kick (trunk)', points: 4 },
  { key: 'spin_head_kick', label: 'Turning kick (head)', points: 5 },
]

export const TECHNIQUE_KEYS: readonly TechniqueKey[] = TECHNIQUES.map((t) => t.key)

// ---------------------------------------------------------------------------
// Match rules (the parts that vary by WT cycle)
// ---------------------------------------------------------------------------

export interface WtRuleSet {
  /** Rounds in a normal match; winner takes the majority. */
  roundsPerMatch: number
  /** Whether a golden-point decider round is played when rounds are split. */
  goldenPointEnabled: boolean
  /** Round number used for the golden-point decider. */
  goldenPointRoundNumber: number
  /** Gam-jeoms in a single round that cause automatic loss of that round. */
  gamJeomRoundLossLimit: number
  /**
   * Point lead within a round that ends the round early (PTG). Used only to
   * validate/flag a recorded PTG result, never to compute one. `null` disables
   * the check until an SME confirms the current-cycle value.
   */
  pointGapThreshold: number | null
}

/**
 * Default WT ruleset. Confirmed with stakeholder:
 *   - gam-jeom = +1 to opponent; 5 in a round ⇒ lose the round.
 * Pending SME confirmation (left at common defaults, tunable here):
 *   - golden-point format, PTG point-gap threshold.
 */
export const DEFAULT_WT_RULES: WtRuleSet = {
  roundsPerMatch: 3,
  goldenPointEnabled: true,
  goldenPointRoundNumber: 4,
  gamJeomRoundLossLimit: 5,
  pointGapThreshold: 12,
}
