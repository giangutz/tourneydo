export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      match_rounds: {
        Row: {
          created_at: string | null
          id: string
          match_id: string
          round_number: number
          score_player1: number | null
          score_player2: number | null
          status: string | null
          updated_at: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id: string
          round_number: number
          score_player1?: number | null
          score_player2?: number | null
          status?: string | null
          updated_at?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string
          round_number?: number
          score_player1?: number | null
          score_player2?: number | null
          status?: string | null
          updated_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_rounds_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_rounds_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          category_id: string | null
          court_id: string | null
          created_at: string
          id: string
          match_number: number | null
          next_match_loser_id: string | null
          next_match_winner_id: string | null
          player1_id: string | null
          player1_score: number | null
          player2_id: string | null
          player2_score: number | null
          round_number: number | null
          start_time: string | null
          status: string | null
          tournament_id: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          category_id?: string | null
          court_id?: string | null
          created_at?: string
          id?: string
          match_number?: number | null
          next_match_loser_id?: string | null
          next_match_winner_id?: string | null
          player1_id?: string | null
          player1_score?: number | null
          player2_id?: string | null
          player2_score?: number | null
          round_number?: number | null
          start_time?: string | null
          status?: string | null
          tournament_id: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          category_id?: string | null
          court_id?: string | null
          created_at?: string
          id?: string
          match_number?: number | null
          next_match_loser_id?: string | null
          next_match_winner_id?: string | null
          player1_id?: string | null
          player1_score?: number | null
          player2_id?: string | null
          player2_score?: number | null
          round_number?: number | null
          start_time?: string | null
          status?: string | null
          tournament_id: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "tournament_courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_next_match_loser_id_fkey"
            columns: ["next_match_loser_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_next_match_winner_id_fkey"
            columns: ["next_match_winner_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          belt_level: string | null
          coach_id: string | null
          created_at: string
          dob: string | null
          first_name: string
          gender: string | null
          height: number | null
          id: string
          last_name: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          belt_level?: string | null
          coach_id?: string | null
          created_at?: string
          dob?: string | null
          first_name: string
          gender?: string | null
          height?: number | null
          id?: string
          last_name: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          belt_level?: string | null
          coach_id?: string | null
          created_at?: string
          dob?: string | null
          first_name?: string
          gender?: string | null
          height?: number | null
          id?: string
          last_name?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_players: {
        Row: {
          created_at: string
          player_id: string
          team_id: string
        }
        Insert: {
          created_at?: string
          player_id: string
          team_id: string
        }
        Update: {
          created_at?: string
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      },
      teams: {
        Row: {
          coach_name: string | null
          contact_number: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_name?: string | null
          contact_number?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_name?: string | null
          contact_number?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_categories: {
        Row: {
          created_at: string
          division_id: string
          gender: string
          id: string
          max_weight: number | null
          min_weight: number | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          division_id: string
          gender: string
          id?: string
          max_weight?: number | null
          min_weight?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          division_id?: string
          gender?: string
          id?: string
          max_weight?: number | null
          min_weight?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_categories_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "tournament_divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_courts: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_courts_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_divisions: {
        Row: {
          created_at: string
          enabled: boolean | null
          id: string
          max_age: number | null
          min_age: number | null
          name: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          max_age?: number | null
          min_age?: number | null
          name: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          max_age?: number | null
          min_age?: number | null
          name?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_divisions_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          actual_height: number | null
          actual_weight: number | null
          category_id: string | null
          coach_id: string
          created_at: string
          disqualification_reason: string | null
          disqualified: boolean | null
          division_id: string | null
          id: string
          payment_status: string | null
          player_id: string
          status: string
          team_id: string
          tournament_id: string
          updated_at: string
          weigh_in_selected: boolean | null
          weighed_in_at: string | null
        }
        Insert: {
          actual_height?: number | null
          actual_weight?: number | null
          category_id?: string | null
          coach_id: string
          created_at?: string
          disqualification_reason?: string | null
          disqualified?: boolean | null
          division_id?: string | null
          id?: string
          payment_status?: string | null
          player_id: string
          status: string
          team_id: string
          tournament_id: string
          updated_at?: string
          weigh_in_selected?: boolean | null
          weighed_in_at?: string | null
        }
        Update: {
          actual_height?: number | null
          actual_weight?: number | null
          category_id?: string | null
          coach_id?: string
          created_at?: string
          disqualification_reason?: string | null
          disqualified?: boolean | null
          division_id?: string | null
          id?: string
          payment_status?: string | null
          player_id?: string
          status?: string
          team_id?: string
          tournament_id?: string
          updated_at?: string
          weigh_in_selected?: boolean | null
          weighed_in_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "tournament_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          accommodation: string | null
          address: string
          city: string
          created_at: string
          deleted_at: string | null
          description: string | null
          end_date: string
          entry_fee: number
          id: string
          max_teams: number | null
          name: string
          organizer_id: string
          prizes: string | null
          registration_deadline: string | null
          rule_set: string | null
          schedule: string | null
          start_date: string
          status: string | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          accommodation?: string | null
          address: string
          city: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          end_date: string
          entry_fee: number
          id?: string
          max_teams?: number | null
          name: string
          organizer_id: string
          prizes?: string | null
          registration_deadline?: string | null
          rule_set?: string | null
          schedule?: string | null
          start_date: string
          status?: string | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          accommodation?: string | null
          address?: string
          city?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string
          entry_fee?: number
          id?: string
          max_teams?: number | null
          name?: string
          organizer_id?: string
          prizes?: string | null
          registration_deadline?: string | null
          rule_set?: string | null
          schedule?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          contact_number: string | null
          country: string | null
          created_at: string
          email: string
          first_name: string | null
          gym: string | null
          id: string
          last_name: string | null
          role: string
          updated_at: string
        }
        Insert: {
          contact_number?: string | null
          country?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          gym?: string | null
          id: string
          last_name?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          contact_number?: string | null
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          gym?: string | null
          id?: string
          last_name?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      belt_level: "White" | "Yellow" | "Green" | "Blue" | "Red" | "Brown" | "Black"
      gender: "male" | "female"
      match_status: "pending" | "in_progress" | "completed"
      payment_status: "pending" | "verified" | "rejected" | "unpaid" | "paid"
      tournament_status:
      | "upcoming"
      | "registration_open"
      | "registration_closed"
      | "live"
      | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof ((Database[PublicTableNameOrOptions["schema"]] extends { Tables: infer T } ? T : never) &
    (Database[PublicTableNameOrOptions["schema"]] extends { Views: infer V } ? V : never))
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? ((Database[PublicTableNameOrOptions["schema"]] extends { Tables: infer T } ? T : never) &
    (Database[PublicTableNameOrOptions["schema"]] extends { Views: infer V } ? V : never))[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]] extends { Tables: infer T } ? T : never)
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]] extends { Tables: infer T } ? T : never)[TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]] extends { Tables: infer T } ? T : never)
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]] extends { Tables: infer T } ? T : never)[TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicEnumNameOrOptions["schema"]] extends { Enums: infer E } ? E : never)
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicEnumNameOrOptions["schema"]] extends { Enums: infer E } ? E : never)[EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof (Database[PublicCompositeTypeNameOrOptions["schema"]] extends { CompositeTypes: infer C } ? C : never)
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicCompositeTypeNameOrOptions["schema"]] extends { CompositeTypes: infer C } ? C : never)[CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
