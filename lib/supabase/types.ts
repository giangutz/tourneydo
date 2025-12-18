import {
  User,
  Team,
  Player,
  TeamPlayer,
  Tournament,
  TournamentRegistration,
  Match,
  MatchInsert,
  MatchUpdate,
  TournamentExpense,
  TournamentExpenseInsert,
  TournamentExpenseUpdate,
  RegistrationInsert,
  RegistrationUpdate
} from '@/types/models'

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'user_id' | 'created_at' | 'updated_at'>>
      }
      teams: {
        Row: Team
        Insert: Omit<Team, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Team, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
      players: {
        Row: Player
        Insert: Omit<Player, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Player, 'id' | 'coach_id' | 'created_at' | 'updated_at'>>
      }
      team_players: {
        Row: TeamPlayer
        Insert: Omit<TeamPlayer, 'created_at'>
        Update: Partial<Omit<TeamPlayer, 'team_id' | 'player_id' | 'created_at'>>
      }
      tournaments: {
        Row: Tournament
        Insert: Omit<Tournament, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Tournament, 'id' | 'organizer_id' | 'created_at' | 'updated_at'>>
      }
      tournament_registrations: {
        Row: TournamentRegistration
        Insert: RegistrationInsert
        Update: RegistrationUpdate
      }
      matches: {
        Row: Match
        Insert: MatchInsert
        Update: MatchUpdate
      }
      tournament_expenses: {
        Row: TournamentExpense
        Insert: TournamentExpenseInsert
        Update: TournamentExpenseUpdate
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
