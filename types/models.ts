/**
 * Domain model type definitions
 * 
 * This file contains all TypeScript types for domain entities.
 * These types are derived from the database schema but represent
 * the application's domain model.
 */

// ============================================================================
// User Types
// ============================================================================

export type UserRole = 'tournament-organizer' | 'coach'

export interface User {
  user_id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export type UserInsert = Omit<User, 'created_at' | 'updated_at'>
export type UserUpdate = Partial<Omit<User, 'user_id' | 'created_at' | 'updated_at'>>

// ============================================================================
// Team Types
// ============================================================================

export interface Team {
  id: string
  name: string
  user_id: string
  created_at: string
  updated_at: string
}

export type TeamInsert = Omit<Team, 'id' | 'created_at' | 'updated_at'>
export type TeamUpdate = Partial<Omit<Team, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

export interface TeamWithPlayerCount extends Team {
  player_count: number
}

// ============================================================================
// Player Types
// ============================================================================

export type BeltLevel = 'White' | 'Yellow' | 'Blue' | 'Red' | 'Brown' | 'Black'

export interface Player {
  id: string
  first_name: string
  last_name: string
  email: string | null
  dob: string | null
  weight: number | null
  height: number | null
  belt_level: BeltLevel | null
  gender: 'male' | 'female' | null
  coach_id: string
  created_at: string
  updated_at: string
}

export type PlayerInsert = Omit<Player, 'id' | 'created_at' | 'updated_at'>
export type PlayerUpdate = Partial<Omit<Player, 'id' | 'coach_id' | 'created_at' | 'updated_at'>>

export interface PlayerWithTeams extends Player {
  teams: Team[]
}

// ============================================================================
// Team-Player Junction Types
// ============================================================================

export interface TeamPlayer {
  team_id: string
  player_id: string
  created_at: string
}

export type TeamPlayerInsert = Omit<TeamPlayer, 'created_at'>

// ============================================================================
// Tournament Types
// ============================================================================

export type TournamentType = 'standard' | 'open-belt'

export interface Tournament {
  id: string
  name: string
  organizer_id: string
  start_date: string | null
  end_date: string | null
  weigh_in_start: string | null
  weigh_in_end: string | null
  description: string | null
  entry_fee: number | null
  venue: string | null
  max_players: number | null
  registration_deadline: string | null
  courts: number | null
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
  tournament_type: TournamentType
  gender_preference: 'mixed' | 'male' | 'female'
  allowed_belt_groups: string[] | null // JSON array of allowed belt groups
  division_move_policy: 'allow_move' | 'disqualify_only'
  created_at: string
  updated_at: string
}

export type TournamentInsert = Omit<Tournament, 'id' | 'created_at' | 'updated_at'>
export type TournamentUpdate = Partial<Omit<Tournament, 'id' | 'organizer_id' | 'created_at' | 'updated_at'>>

// ============================================================================
// Tournament Registration Types
// ============================================================================

export interface TournamentRegistration {
  id: string
  tournament_id: string
  team_id: string
  player_id: string
  coach_id: string
  division_id?: string | null
  category_id?: string | null
  status: 'pending' | 'verified' | 'paid'
  actual_weight: number | null
  actual_height: number | null
  disqualified: boolean
  disqualification_reason: string | null
  weighed_in_at: string | null
  weighed_in_by: string | null
  weigh_in_selected: boolean
  created_at: string
  updated_at: string
}

export type RegistrationInsert = Omit<TournamentRegistration, 'id' | 'created_at' | 'updated_at' | 'actual_weight' | 'actual_height' | 'disqualified' | 'disqualification_reason' | 'weighed_in_at'>
export type RegistrationUpdate = Partial<Omit<TournamentRegistration, 'id' | 'tournament_id' | 'team_id' | 'created_at' | 'updated_at'>>

export type TournamentRegistrationInsert = Omit<TournamentRegistration, 'id' | 'created_at' | 'updated_at'>
export type TournamentRegistrationUpdate = Partial<Omit<TournamentRegistration, 'id' | 'created_at' | 'updated_at'>>

// ============================================================================
// Schedule Configuration Types
// ============================================================================

// Tournament Schedule Configuration
export interface TournamentScheduleConfig {
  id: string
  tournament_id: string
  daily_start_time: string  // HH:MM format
  daily_end_time: string
  courts: number

  // Detailed time configuration per division (seconds)
  gradeschool_round_time: number | null
  gradeschool_kyeshi_time: number | null
  gradeschool_rest_between_rounds: number | null

  cadet_round_time: number | null
  cadet_kyeshi_time: number | null
  cadet_rest_between_rounds: number | null

  junior_round_time: number | null
  junior_kyeshi_time: number | null
  junior_rest_between_rounds: number | null

  senior_round_time: number | null
  senior_kyeshi_time: number | null
  senior_rest_between_rounds: number | null

  // Legacy duration defaults (minutes)
  default_sparring_duration: number | null
  default_poomsae_duration: number | null
  default_breaking_duration: number | null

  // Scheduling constraints
  max_divisions_per_day: number | null

  created_at: string | null
  updated_at: string | null
}

export type TournamentScheduleConfigInsert = Omit<TournamentScheduleConfig, 'id' | 'created_at' | 'updated_at'>
export type TournamentScheduleConfigUpdate = Partial<Omit<TournamentScheduleConfig, 'id' | 'tournament_id' | 'created_at' | 'updated_at'>>

// Schedule Validation with Override Support
export interface ScheduleValidationResult {
  feasible: boolean
  totalDays: number
  totalMatches: number
  totalRequiredMinutes: number
  totalAvailableMinutes: number
  courtsUtilization: CourtUtilization[]
  warnings: string[]
  errors: ScheduleValidationError[]
  recommendations: string[]
  canProceedWithOverride: boolean
  overflowCount?: number
  overflowMinutes?: number
}

export interface ScheduleValidationError {
  type: 'time_overflow' | 'too_many_divisions_per_day' | 'insufficient_courts'
  message: string
  affectedDivisions?: string[]
  suggestedFix: string
}

export interface CourtUtilization {
  day: number
  court: number
  matchCount: number
  utilizationPercent: number
  startTime: string
  endTime: string
}

// Division Schedule Configuration
export type CompetitionType = 'sparring' | 'poomsae' | 'breaking'

export interface DivisionScheduleConfig {
  id: string
  tournament_id: string
  division_id: string
  category_id: string
  priority: number
  participant_count: number | null
  competition_type: CompetitionType
  avg_match_duration: number | null
  estimated_match_count: number | null
  estimated_total_minutes: number | null
  scheduled_day: number | null
  created_at: string | null
  updated_at: string | null
}

export type DivisionScheduleConfigInsert = Omit<DivisionScheduleConfig, 'id' | 'created_at' | 'updated_at'>
export type DivisionScheduleConfigUpdate = Partial<Omit<DivisionScheduleConfig, 'id' | 'tournament_id' | 'created_at' | 'updated_at'>>

// Match Assignment Result
export interface MatchAssignment {
  matchId: string
  matchNumber: string // MXYZ format
  day: number
  court: number
  sequence: number
  estimatedStartTime: string // For coach planning (e.g., "10:20 AM")
  scheduledStartTime: string // ISO timestamp
  scheduledEndTime: string // ISO timestamp
  divisionId: string
  categoryId: string
}

// Daily Schedule Summary (for dashboard card)
// Daily Schedule Summary (for dashboard card)
export interface DivisionExecutionDetails {
  divisionName: string
  matchCount: number
  startTime: string // HH:MM AM/PM
  endTime: string   // HH:MM AM/PM
}

export interface DailyScheduleSummary {
  day: number
  date: string
  courtsActive: number
  matchCount: number
  startTime: string // HH:MM AM/PM
  endTime: string   // HH:MM AM/PM
  avgMatchesPerHour: number
  divisions: DivisionExecutionDetails[]
}

// ============================================================================
// Match Types
// ============================================================================

export type MatchStatus = 'scheduled' | 'in_progress' | 'completed'

/**
 * WT-Compliant Match Lifecycle States
 * 
 * AUTO_ADVANCE: BYE resolution - invisible in bracket UI, never scheduled, no court time
 * WAITING: Match exists in bracket, visible & numbered, but not callable (deps unresolved)
 * CONTEST: Both athletes known, all deps resolved, callable to court
 * IN_PROGRESS: Match currently being played
 * COMPLETED: Match finished, winner propagated downstream
 */
export type MatchLifecycleState =
  | 'AUTO_ADVANCE'
  | 'WAITING'
  | 'CONTEST'
  | 'IN_PROGRESS'
  | 'COMPLETED'

export interface Match {
  id: string
  tournament_id: string
  round: number
  match_number: number
  match_number_formatted: string | null // WT format: CourtSequence (e.g., 101, 312)
  match_number_legacy: string | null // Old match number if migrated
  day_number: number | null
  match_sequence: number | null
  division_id?: string
  category_id?: string
  player1_id: string | null
  player2_id: string | null
  winner_id: string | null
  score_player1: number
  score_player2: number
  score_round1_player1: number
  score_round1_player2: number
  score_round2_player1: number
  score_round2_player2: number
  score_round3_player1: number
  score_round3_player2: number
  winner_round1: string | null
  winner_round2: string | null
  winner_round3: string | null
  court_number: number | null
  status: MatchStatus

  // WT Lifecycle State (determines visibility and callability)
  lifecycle_state: MatchLifecycleState

  // DAG Dependency Tracking (0-2 source matches that feed into this one)
  source_match_ids: string[]

  // Recovery Tracking (when athletes become available after previous match)
  athlete1_available_at: string | null
  athlete2_available_at: string | null

  next_match_id: string | null
  source_match_id: string | null // Legacy single reference
  scheduled_start_time: string | null
  scheduled_end_time: string | null
  actual_start_time: string | null
  actual_end_time: string | null
  created_at: string
  updated_at: string

  // Joined data
  tournament_divisions?: {
    id: string
    name: string
    min_age: number | null
    max_age: number | null
  } | null
  tournament_categories?: {
    id: string
    name: string
    gender: 'male' | 'female' | 'mixed'
  } | null

  // Joined player data (optional, depends on query)
  player1?: {
    id: string
    first_name: string
    last_name: string
    belt_level: string | null
  } | null
  player2?: {
    id: string
    first_name: string
    last_name: string
    belt_level: string | null
  } | null
}

export type MatchInsert = Omit<Match, 'created_at' | 'updated_at'> & {
  id?: string
  // New fields are optional for backward compatibility - they have DB defaults
  lifecycle_state?: MatchLifecycleState
  source_match_ids?: string[]
  athlete1_available_at?: string | null
  athlete2_available_at?: string | null
}
export type MatchUpdate = Partial<Omit<Match, 'id' | 'tournament_id' | 'created_at' | 'updated_at'>>

// ============================================================================
// Athlete Readiness Types (WT Operational Gate)
// ============================================================================

/**
 * Athlete readiness tracking for WT-style match coordination.
 * This is an operational gate - does NOT affect scheduling, numbering, or dependencies.
 */
export interface MatchAthleteReadiness {
  id: string
  match_id: string
  athlete_id: string
  called: boolean // Athlete is present, geared, and on standby
  called_at: string | null
  called_by: string | null // Clerk user ID
  created_at: string
  updated_at: string
}

export type MatchAthleteReadinessInsert = Omit<MatchAthleteReadiness, 'id' | 'created_at' | 'updated_at'>
export type MatchAthleteReadinessUpdate = Partial<Omit<MatchAthleteReadiness, 'id' | 'match_id' | 'athlete_id' | 'created_at' | 'updated_at'>>

/**
 * Match with readiness status included (for UI display)
 */
export interface MatchWithReadiness extends Match {
  athlete1_called: boolean
  athlete2_called: boolean
}

/**
 * Complete readiness status including all blocking conditions
 */
export interface ReadinessStatus {
  athlete1Called: boolean
  athlete2Called: boolean
  bothReady: boolean
  canStart: boolean // Combines readiness + dependencies + recovery + court
  blockedReasons: string[]
}


// ============================================================================
// Expense Types
// ============================================================================

export interface TournamentExpense {
  id: string
  tournament_id: string
  category: string
  description: string | null
  amount: number
  created_at: string
  updated_at: string
}

export type TournamentExpenseInsert = Omit<TournamentExpense, 'id' | 'created_at' | 'updated_at'>
export type TournamentExpenseUpdate = Partial<Omit<TournamentExpense, 'id' | 'tournament_id' | 'created_at' | 'updated_at'>>

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Generic type for entities with timestamps
 */
export type WithTimestamps<T> = T & {
  created_at: string
  updated_at: string
}

/**
 * Generic type for entities with an ID
 */
export type WithId<T> = T & {
  id: string
}

/**
 * Helper type to make specific fields optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// ============================================================================
// Payment Types
// ============================================================================

export interface Payment {
  id: string
  tournament_id: string
  team_id: string
  coach_id: string
  amount: number
  reference_number: string
  status: 'pending' | 'verified' | 'rejected'
  rejection_reason: string | null
  created_at: string
}

export type PaymentInsert = Omit<Payment, 'id' | 'created_at' | 'status' | 'rejection_reason'>
export type PaymentUpdate = Partial<Omit<Payment, 'id' | 'tournament_id' | 'team_id' | 'coach_id' | 'created_at'>>

// ============================================================================
// Staff Types
// ============================================================================

export type TournamentRole = 'admin' | 'staff' | 'official' | 'bracket_manager' | 'registration_manager' | 'weigh_in_staff'

export interface TournamentStaff {
  id: string
  tournament_id: string
  user_id: string | null
  email: string
  role: TournamentRole
  status: 'pending' | 'active'
  created_at: string
  updated_at: string
}

export type TournamentStaffInsert = Omit<TournamentStaff, 'id' | 'created_at' | 'updated_at'>
export type TournamentStaffUpdate = Partial<Omit<TournamentStaff, 'id' | 'tournament_id' | 'created_at' | 'updated_at'>>
