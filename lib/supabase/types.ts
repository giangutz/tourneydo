export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums
export type TournamentStatus = 'upcoming' | 'registration_open' | 'registration_closed' | 'live' | 'completed'
export type PaymentStatus = 'pending' | 'verified' | 'rejected'
export type MatchStatus = 'pending' | 'in_progress' | 'completed'
export type BeltLevel = 'white' | 'yellow' | 'green' | 'blue' | 'red' | 'black'
export type Gender = 'male' | 'female'

export interface Database {
  public: {
    Tables: {
      tournaments: {
        Row: {
          id: string
          title: string
          date: string
          venue: string
          registration_deadline: string
          fees: number
          status: TournamentStatus
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          date: string
          venue: string
          registration_deadline: string
          fees: number
          status?: TournamentStatus
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          date?: string
          venue?: string
          registration_deadline?: string
          fees?: number
          status?: TournamentStatus
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          coach_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          coach_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          coach_user_id?: string
          created_at?: string
        }
      }
      athletes: {
        Row: {
          id: string
          team_id: string
          name: string
          age: number
          weight: number
          belt_level: BeltLevel
          gender: Gender
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          age: number
          weight: number
          belt_level: BeltLevel
          gender: Gender
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          age?: number
          weight?: number
          belt_level?: BeltLevel
          gender?: Gender
          created_at?: string
        }
      }
      divisions: {
        Row: {
          id: string
          tournament_id: string
          name: string
          age_min: number
          age_max: number
          weight_min: number
          weight_max: number
          belt_level: BeltLevel
          gender: Gender
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          name: string
          age_min: number
          age_max: number
          weight_min: number
          weight_max: number
          belt_level: BeltLevel
          gender: Gender
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          name?: string
          age_min?: number
          age_max?: number
          weight_min?: number
          weight_max?: number
          belt_level?: BeltLevel
          gender?: Gender
          created_at?: string
        }
      }
      registrations: {
        Row: {
          id: string
          athlete_id: string
          tournament_id: string
          division_id: string | null
          weighed_in: boolean
          cleared: boolean
          created_at: string
        }
        Insert: {
          id?: string
          athlete_id: string
          tournament_id: string
          division_id?: string | null
          weighed_in?: boolean
          cleared?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          athlete_id?: string
          tournament_id?: string
          division_id?: string | null
          weighed_in?: boolean
          cleared?: boolean
          created_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          tournament_id: string
          division_id: string
          round: number
          position: number
          red_corner_athlete_id: string | null
          blue_corner_athlete_id: string | null
          winner_id: string | null
          next_match_id: string | null
          status: MatchStatus
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          division_id: string
          round: number
          position: number
          red_corner_athlete_id?: string | null
          blue_corner_athlete_id?: string | null
          winner_id?: string | null
          next_match_id?: string | null
          status?: MatchStatus
          created_at?: string
        }
        Update: {
          id?: string
          tournament_id?: string
          division_id?: string
          round?: number
          position?: number
          red_corner_athlete_id?: string | null
          blue_corner_athlete_id?: string | null
          winner_id?: string | null
          next_match_id?: string | null
          status?: MatchStatus
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          tournament_id: string
          coach_user_id: string
          amount: number
          proof_image_url: string | null
          status: PaymentStatus
          created_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          id?: string
          tournament_id: string
          coach_user_id: string
          amount: number
          proof_image_url?: string | null
          status?: PaymentStatus
          created_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          id?: string
          tournament_id?: string
          coach_user_id?: string
          amount?: number
          proof_image_url?: string | null
          status?: PaymentStatus
          created_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      tournament_status: TournamentStatus
      payment_status: PaymentStatus
      match_status: MatchStatus
      belt_level: BeltLevel
      gender: Gender
    }
  }
}
