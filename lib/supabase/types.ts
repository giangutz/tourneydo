export type UserRole = 'tournament-organizer' | 'coach'

export interface User {
  user_id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  name: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  first_name: string
  last_name: string
  email: string | null
  dob: string | null
  coach_id: string
  created_at: string
  updated_at: string
}

export interface TeamPlayer {
  team_id: string
  player_id: string
  created_at: string
}

export interface Tournament {
  id: string
  name: string
  organizer_id: string
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface TournamentRegistration {
  id: string
  tournament_id: string
  team_id: string
  player_id: string
  created_at: string
  updated_at: string
}

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
        Insert: Omit<TournamentRegistration, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TournamentRegistration, 'id' | 'created_at' | 'updated_at'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
