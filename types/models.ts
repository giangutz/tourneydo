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
  payment_status?: 'unpaid' | 'paid'
  actual_weight: number | null
  actual_height: number | null
  disqualified: boolean
  disqualification_reason: string | null
  weighed_in_at: string | null
  weigh_in_selected: boolean
  created_at: string
  updated_at: string
}

export type RegistrationInsert = Omit<TournamentRegistration, 'id' | 'created_at' | 'updated_at' | 'actual_weight' | 'actual_height' | 'disqualified' | 'disqualification_reason' | 'weighed_in_at'>
export type RegistrationUpdate = Partial<Omit<TournamentRegistration, 'id' | 'tournament_id' | 'team_id' | 'created_at' | 'updated_at'>>

export type TournamentRegistrationInsert = Omit<TournamentRegistration, 'id' | 'created_at' | 'updated_at'>
export type TournamentRegistrationUpdate = Partial<Omit<TournamentRegistration, 'id' | 'created_at' | 'updated_at'>>

// ============================================================================
// Match Types
// ============================================================================

export type MatchStatus = 'scheduled' | 'in_progress' | 'completed'

export interface Match {
  id: string
  tournament_id: string
  round: number
  match_number: number
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
  next_match_id: string | null
  source_match_id: string | null
  scheduled_start_time: string | null
  scheduled_end_time: string | null
  actual_start_time: string | null
  actual_end_time: string | null
  created_at: string
  updated_at: string
}

export type MatchInsert = Omit<Match, 'created_at' | 'updated_at'> & { id?: string }
export type MatchUpdate = Partial<Omit<Match, 'id' | 'tournament_id' | 'created_at' | 'updated_at'>>

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
  created_at: string
}

export type PaymentInsert = Omit<Payment, 'id' | 'created_at' | 'status'>
export type PaymentUpdate = Partial<Omit<Payment, 'id' | 'tournament_id' | 'team_id' | 'coach_id' | 'created_at'>>

// ============================================================================
// Staff Types
// ============================================================================

export type TournamentRole = 'admin' | 'staff' | 'official'

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
