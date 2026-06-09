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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      athlete_merge_log: {
        Row: {
          global_athlete_id: string
          id: string
          merged_at: string
          merged_by: string | null
          notes: string | null
          player_id: string
        }
        Insert: {
          global_athlete_id: string
          id?: string
          merged_at?: string
          merged_by?: string | null
          notes?: string | null
          player_id: string
        }
        Update: {
          global_athlete_id?: string
          id?: string
          merged_at?: string
          merged_by?: string | null
          notes?: string | null
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_merge_log_global_athlete_id_fkey"
            columns: ["global_athlete_id"]
            isOneToOne: false
            referencedRelation: "global_athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_merge_log_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_trail: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          new_state: Json | null
          previous_state: Json | null
          tournament_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          new_state?: Json | null
          previous_state?: Json | null
          tournament_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_state?: Json | null
          previous_state?: Json | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_trail_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      division_schedule_config: {
        Row: {
          avg_match_duration: number | null
          category_id: string
          competition_type: string | null
          created_at: string | null
          division_id: string
          estimated_match_count: number | null
          estimated_total_minutes: number | null
          id: string
          participant_count: number | null
          priority: number
          scheduled_day: number | null
          tournament_id: string
          updated_at: string | null
        }
        Insert: {
          avg_match_duration?: number | null
          category_id: string
          competition_type?: string | null
          created_at?: string | null
          division_id: string
          estimated_match_count?: number | null
          estimated_total_minutes?: number | null
          id?: string
          participant_count?: number | null
          priority: number
          scheduled_day?: number | null
          tournament_id: string
          updated_at?: string | null
        }
        Update: {
          avg_match_duration?: number | null
          category_id?: string
          competition_type?: string | null
          created_at?: string | null
          division_id?: string
          estimated_match_count?: number | null
          estimated_total_minutes?: number | null
          id?: string
          participant_count?: number | null
          priority?: number
          scheduled_day?: number | null
          tournament_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "division_schedule_config_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "division_schedule_config_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "tournament_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "division_schedule_config_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      global_athletes: {
        Row: {
          canonical_first_name: string
          canonical_last_name: string
          created_at: string
          created_by: string | null
          dob: string | null
          gender: string | null
          id: string
          total_bronze: number
          total_gold: number
          total_silver: number
          total_tournaments: number
          updated_at: string
        }
        Insert: {
          canonical_first_name: string
          canonical_last_name: string
          created_at?: string
          created_by?: string | null
          dob?: string | null
          gender?: string | null
          id?: string
          total_bronze?: number
          total_gold?: number
          total_silver?: number
          total_tournaments?: number
          updated_at?: string
        }
        Update: {
          canonical_first_name?: string
          canonical_last_name?: string
          created_at?: string
          created_by?: string | null
          dob?: string | null
          gender?: string | null
          id?: string
          total_bronze?: number
          total_gold?: number
          total_silver?: number
          total_tournaments?: number
          updated_at?: string
        }
        Relationships: []
      }
      match_athlete_readiness: {
        Row: {
          athlete_id: string
          called: boolean
          called_at: string | null
          called_by: string | null
          created_at: string
          id: string
          match_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          called?: boolean
          called_at?: string | null
          called_by?: string | null
          created_at?: string
          id?: string
          match_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          called?: boolean
          called_at?: string | null
          called_by?: string | null
          created_at?: string
          id?: string
          match_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_athlete_readiness_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_athlete_readiness_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_gam_jeoms: {
        Row: {
          created_at: string
          gam_jeom_type: string
          id: string
          match_id: string
          player_id: string
          round_number: number
        }
        Insert: {
          created_at?: string
          gam_jeom_type: string
          id?: string
          match_id: string
          player_id: string
          round_number: number
        }
        Update: {
          created_at?: string
          gam_jeom_type?: string
          id?: string
          match_id?: string
          player_id?: string
          round_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_gam_jeoms_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_gam_jeoms_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_player_round_stats: {
        Row: {
          body_kick: number
          created_at: string
          head_kick: number
          id: string
          match_id: string
          player_id: string
          punch: number
          round_number: number
          spin_body_kick: number
          spin_head_kick: number
          updated_at: string
        }
        Insert: {
          body_kick?: number
          created_at?: string
          head_kick?: number
          id?: string
          match_id: string
          player_id: string
          punch?: number
          round_number: number
          spin_body_kick?: number
          spin_head_kick?: number
          updated_at?: string
        }
        Update: {
          body_kick?: number
          created_at?: string
          head_kick?: number
          id?: string
          match_id?: string
          player_id?: string
          punch?: number
          round_number?: number
          spin_body_kick?: number
          spin_head_kick?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_player_round_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_player_round_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
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
          actual_end_time: string | null
          actual_start_time: string | null
          athlete1_available_at: string | null
          athlete2_available_at: string | null
          bracket_position: string | null
          category_id: string | null
          court_number: number | null
          created_at: string
          day_number: number | null
          division_id: string | null
          id: string
          lifecycle_state:
            | Database["public"]["Enums"]["match_lifecycle_state"]
            | null
          match_number: number
          match_number_formatted: string | null
          match_number_legacy: string | null
          match_sequence: number | null
          next_match_id: string | null
          player1_id: string | null
          player2_id: string | null
          round: number
          round_name: string | null
          round_order: number | null
          scheduled_end_time: string | null
          scheduled_start_time: string | null
          score_player1: number | null
          score_player2: number | null
          score_round1_player1: number
          score_round1_player2: number
          score_round2_player1: number
          score_round2_player2: number
          score_round3_player1: number
          score_round3_player2: number
          skill_level: string | null
          source_match_id: string | null
          source_match_ids: string[] | null
          status: string
          structural_match_number: number | null
          tournament_id: string
          updated_at: string
          win_method: Database["public"]["Enums"]["win_method"] | null
          winner_id: string | null
          winner_round1: string | null
          winner_round2: string | null
          winner_round3: string | null
          winning_round: number | null
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          athlete1_available_at?: string | null
          athlete2_available_at?: string | null
          bracket_position?: string | null
          category_id?: string | null
          court_number?: number | null
          created_at?: string
          day_number?: number | null
          division_id?: string | null
          id?: string
          lifecycle_state?:
            | Database["public"]["Enums"]["match_lifecycle_state"]
            | null
          match_number: number
          match_number_formatted?: string | null
          match_number_legacy?: string | null
          match_sequence?: number | null
          next_match_id?: string | null
          player1_id?: string | null
          player2_id?: string | null
          round: number
          round_name?: string | null
          round_order?: number | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          score_player1?: number | null
          score_player2?: number | null
          score_round1_player1?: number
          score_round1_player2?: number
          score_round2_player1?: number
          score_round2_player2?: number
          score_round3_player1?: number
          score_round3_player2?: number
          skill_level?: string | null
          source_match_id?: string | null
          source_match_ids?: string[] | null
          status?: string
          structural_match_number?: number | null
          tournament_id: string
          updated_at?: string
          win_method?: Database["public"]["Enums"]["win_method"] | null
          winner_id?: string | null
          winner_round1?: string | null
          winner_round2?: string | null
          winner_round3?: string | null
          winning_round?: number | null
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          athlete1_available_at?: string | null
          athlete2_available_at?: string | null
          bracket_position?: string | null
          category_id?: string | null
          court_number?: number | null
          created_at?: string
          day_number?: number | null
          division_id?: string | null
          id?: string
          lifecycle_state?:
            | Database["public"]["Enums"]["match_lifecycle_state"]
            | null
          match_number?: number
          match_number_formatted?: string | null
          match_number_legacy?: string | null
          match_sequence?: number | null
          next_match_id?: string | null
          player1_id?: string | null
          player2_id?: string | null
          round?: number
          round_name?: string | null
          round_order?: number | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          score_player1?: number | null
          score_player2?: number | null
          score_round1_player1?: number
          score_round1_player2?: number
          score_round2_player1?: number
          score_round2_player2?: number
          score_round3_player1?: number
          score_round3_player2?: number
          skill_level?: string | null
          source_match_id?: string | null
          source_match_ids?: string[] | null
          status?: string
          structural_match_number?: number | null
          tournament_id?: string
          updated_at?: string
          win_method?: Database["public"]["Enums"]["win_method"] | null
          winner_id?: string | null
          winner_round1?: string | null
          winner_round2?: string | null
          winner_round3?: string | null
          winning_round?: number | null
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
            foreignKeyName: "matches_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "tournament_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_next_match_id_fkey"
            columns: ["next_match_id"]
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
            foreignKeyName: "matches_source_match_id_fkey"
            columns: ["source_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
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
          {
            foreignKeyName: "matches_winner_round1_fkey"
            columns: ["winner_round1"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_round2_fkey"
            columns: ["winner_round2"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_round3_fkey"
            columns: ["winner_round3"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_players: {
        Row: {
          created_at: string
          payment_id: string
          player_id: string
        }
        Insert: {
          created_at?: string
          payment_id: string
          player_id: string
        }
        Update: {
          created_at?: string
          payment_id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_players_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          coach_id: string
          created_at: string | null
          id: string
          reference_number: string
          rejection_reason: string | null
          status: string | null
          team_id: string
          tournament_id: string
        }
        Insert: {
          amount: number
          coach_id: string
          created_at?: string | null
          id?: string
          reference_number: string
          rejection_reason?: string | null
          status?: string | null
          team_id: string
          tournament_id: string
        }
        Update: {
          amount?: number
          coach_id?: string
          created_at?: string | null
          id?: string
          reference_number?: string
          rejection_reason?: string | null
          status?: string | null
          team_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          belt_level: string | null
          coach_id: string
          created_at: string
          dob: string | null
          email: string | null
          first_name: string
          gender: string | null
          global_athlete_id: string | null
          height: number | null
          id: string
          last_name: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          belt_level?: string | null
          coach_id: string
          created_at?: string
          dob?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          global_athlete_id?: string | null
          height?: number | null
          id?: string
          last_name: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          belt_level?: string | null
          coach_id?: string
          created_at?: string
          dob?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          global_athlete_id?: string | null
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
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "players_global_athlete_id_fkey"
            columns: ["global_athlete_id"]
            isOneToOne: false
            referencedRelation: "global_athletes"
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
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tournament_categories: {
        Row: {
          created_at: string
          division_id: string
          gender: string
          id: string
          max_height: number | null
          max_weight: number | null
          min_height: number | null
          min_weight: number | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          division_id: string
          gender: string
          id?: string
          max_height?: number | null
          max_weight?: number | null
          min_height?: number | null
          min_weight?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          division_id?: string
          gender?: string
          id?: string
          max_height?: number | null
          max_weight?: number | null
          min_height?: number | null
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
      tournament_divisions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          max_age: number | null
          min_age: number | null
          name: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          max_age?: number | null
          min_age?: number | null
          name: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
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
      tournament_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string | null
          id: string
          tournament_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          tournament_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          tournament_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_expenses_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_placements: {
        Row: {
          category_id: string | null
          computed_at: string
          division_id: string | null
          id: string
          medal: string
          placement: number
          player_id: string
          tournament_id: string
        }
        Insert: {
          category_id?: string | null
          computed_at?: string
          division_id?: string | null
          id?: string
          medal: string
          placement: number
          player_id: string
          tournament_id: string
        }
        Update: {
          category_id?: string | null
          computed_at?: string
          division_id?: string | null
          id?: string
          medal?: string
          placement?: number
          player_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_placements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_placements_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "tournament_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_placements_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_placements_tournament_id_fkey"
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
          coach_id: string | null
          created_at: string
          disqualification_reason: string | null
          disqualified: boolean
          division_id: string | null
          id: string
          player_id: string
          random_weigh_in_at: string | null
          random_weigh_in_by: string | null
          random_weigh_in_passed: boolean | null
          random_weigh_in_weight: number | null
          status: string
          team_id: string
          tournament_id: string
          updated_at: string
          weigh_in_selected: boolean | null
          weighed_in_at: string | null
          weighed_in_by: string | null
        }
        Insert: {
          actual_height?: number | null
          actual_weight?: number | null
          category_id?: string | null
          coach_id?: string | null
          created_at?: string
          disqualification_reason?: string | null
          disqualified?: boolean
          division_id?: string | null
          id?: string
          player_id: string
          random_weigh_in_at?: string | null
          random_weigh_in_by?: string | null
          random_weigh_in_passed?: boolean | null
          random_weigh_in_weight?: number | null
          status?: string
          team_id: string
          tournament_id: string
          updated_at?: string
          weigh_in_selected?: boolean | null
          weighed_in_at?: string | null
          weighed_in_by?: string | null
        }
        Update: {
          actual_height?: number | null
          actual_weight?: number | null
          category_id?: string | null
          coach_id?: string | null
          created_at?: string
          disqualification_reason?: string | null
          disqualified?: boolean
          division_id?: string | null
          id?: string
          player_id?: string
          random_weigh_in_at?: string | null
          random_weigh_in_by?: string | null
          random_weigh_in_passed?: boolean | null
          random_weigh_in_weight?: number | null
          status?: string
          team_id?: string
          tournament_id?: string
          updated_at?: string
          weigh_in_selected?: boolean | null
          weighed_in_at?: string | null
          weighed_in_by?: string | null
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
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "tournament_registrations_weighed_in_by_fkey"
            columns: ["weighed_in_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tournament_schedule_config: {
        Row: {
          cadet_kyeshi_time: number | null
          cadet_rest_between_rounds: number | null
          cadet_round_time: number | null
          courts: number
          created_at: string | null
          daily_end_time: string
          daily_start_time: string
          default_breaking_duration: number | null
          default_poomsae_duration: number | null
          default_sparring_duration: number | null
          gradeschool_kyeshi_time: number | null
          gradeschool_rest_between_rounds: number | null
          gradeschool_round_time: number | null
          id: string
          junior_kyeshi_time: number | null
          junior_rest_between_rounds: number | null
          junior_round_time: number | null
          lunch_enabled: boolean
          lunch_end_time: string
          lunch_start_time: string
          max_divisions_per_day: number | null
          senior_kyeshi_time: number | null
          senior_rest_between_rounds: number | null
          senior_round_time: number | null
          tournament_id: string
          updated_at: string | null
        }
        Insert: {
          cadet_kyeshi_time?: number | null
          cadet_rest_between_rounds?: number | null
          cadet_round_time?: number | null
          courts?: number
          created_at?: string | null
          daily_end_time?: string
          daily_start_time?: string
          default_breaking_duration?: number | null
          default_poomsae_duration?: number | null
          default_sparring_duration?: number | null
          gradeschool_kyeshi_time?: number | null
          gradeschool_rest_between_rounds?: number | null
          gradeschool_round_time?: number | null
          id?: string
          junior_kyeshi_time?: number | null
          junior_rest_between_rounds?: number | null
          junior_round_time?: number | null
          lunch_enabled?: boolean
          lunch_end_time?: string
          lunch_start_time?: string
          max_divisions_per_day?: number | null
          senior_kyeshi_time?: number | null
          senior_rest_between_rounds?: number | null
          senior_round_time?: number | null
          tournament_id: string
          updated_at?: string | null
        }
        Update: {
          cadet_kyeshi_time?: number | null
          cadet_rest_between_rounds?: number | null
          cadet_round_time?: number | null
          courts?: number
          created_at?: string | null
          daily_end_time?: string
          daily_start_time?: string
          default_breaking_duration?: number | null
          default_poomsae_duration?: number | null
          default_sparring_duration?: number | null
          gradeschool_kyeshi_time?: number | null
          gradeschool_rest_between_rounds?: number | null
          gradeschool_round_time?: number | null
          id?: string
          junior_kyeshi_time?: number | null
          junior_rest_between_rounds?: number | null
          junior_round_time?: number | null
          lunch_enabled?: boolean
          lunch_end_time?: string
          lunch_start_time?: string
          max_divisions_per_day?: number | null
          senior_kyeshi_time?: number | null
          senior_rest_between_rounds?: number | null
          senior_round_time?: number | null
          tournament_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_schedule_config_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: true
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_staff: {
        Row: {
          created_at: string
          email: string
          id: string
          last_invited_at: string | null
          roles: string[]
          status: string
          tournament_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_invited_at?: string | null
          roles?: string[]
          status?: string
          tournament_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_invited_at?: string | null
          roles?: string[]
          status?: string
          tournament_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_staff_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tournaments: {
        Row: {
          allowed_belt_groups: Json | null
          courts: number | null
          created_at: string
          description: string | null
          division_move_policy:
            | Database["public"]["Enums"]["division_move_policy"]
            | null
          end_date: string | null
          entry_fee: number | null
          gender_preference: string | null
          id: string
          max_players: number | null
          name: string
          organizer_id: string
          registration_deadline: string | null
          start_date: string | null
          status: string
          tournament_type: string
          updated_at: string
          venue: string | null
          weigh_in_end: string | null
          weigh_in_start: string | null
        }
        Insert: {
          allowed_belt_groups?: Json | null
          courts?: number | null
          created_at?: string
          description?: string | null
          division_move_policy?:
            | Database["public"]["Enums"]["division_move_policy"]
            | null
          end_date?: string | null
          entry_fee?: number | null
          gender_preference?: string | null
          id?: string
          max_players?: number | null
          name: string
          organizer_id: string
          registration_deadline?: string | null
          start_date?: string | null
          status?: string
          tournament_type?: string
          updated_at?: string
          venue?: string | null
          weigh_in_end?: string | null
          weigh_in_start?: string | null
        }
        Update: {
          allowed_belt_groups?: Json | null
          courts?: number | null
          created_at?: string
          description?: string | null
          division_move_policy?:
            | Database["public"]["Enums"]["division_move_policy"]
            | null
          end_date?: string | null
          entry_fee?: number | null
          gender_preference?: string | null
          id?: string
          max_players?: number | null
          name?: string
          organizer_id?: string
          registration_deadline?: string | null
          start_date?: string | null
          status?: string
          tournament_type?: string
          updated_at?: string
          venue?: string | null
          weigh_in_end?: string | null
          weigh_in_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          last_name: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          last_name?: string | null
          role: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      dedup_candidates: {
        Row: {
          dob: string | null
          norm_first: string | null
          norm_last: string | null
          player_count: number | null
          player_ids: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      advance_match_winner:
        | {
            Args: {
              p_match_id: string
              p_player1_wins: number
              p_player2_wins: number
              p_winner_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_match_id: string
              p_player1_wins: number
              p_player2_wins: number
              p_win_method?: Database["public"]["Enums"]["win_method"]
              p_winner_id: string
              p_winning_round?: number
            }
            Returns: Json
          }
      archive_match_numbers: {
        Args: { p_tournament_id: string }
        Returns: undefined
      }
      batch_update_match_schedule: {
        Args: { p_assignments: Json }
        Returns: undefined
      }
      get_match_readiness_status: {
        Args: { p_match_id: string }
        Returns: {
          athlete1_called: boolean
          athlete2_called: boolean
        }[]
      }
      initialize_match_readiness: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      insert_audit_entry: {
        Args: {
          p_action: string
          p_actor_id: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_new_state?: Json
          p_previous_state?: Json
          p_tournament_id: string
        }
        Returns: undefined
      }
      reverse_match_advancement: { Args: { p_match_id: string }; Returns: Json }
      save_match_scores_atomic:
        | { Args: { p_match_id: string; p_rounds: Json }; Returns: Json }
        | {
            Args: {
              p_gam_jeoms?: Json
              p_match_id: string
              p_rounds: Json
              p_techniques?: Json
            }
            Returns: Json
          }
    }
    Enums: {
      belt_level: "white" | "yellow" | "green" | "blue" | "red" | "black"
      division_move_policy: "allow_move" | "disqualify_only"
      gender: "male" | "female"
      match_lifecycle_state:
        | "AUTO_ADVANCE"
        | "WAITING"
        | "CONTEST"
        | "IN_PROGRESS"
        | "COMPLETED"
      match_status: "pending" | "in_progress" | "completed"
      payment_status: "pending" | "verified" | "rejected"
      tournament_status:
        | "upcoming"
        | "registration_open"
        | "registration_closed"
        | "live"
        | "completed"
      win_method:
        | "SCORE"
        | "KO"
        | "TKO"
        | "DQ"
        | "WITHDRAWAL"
        | "FORFEIT"
        | "PTF"
        | "PTG"
        | "GDP"
        | "SUP"
        | "RSC"
        | "WDR"
        | "DSQ"
        | "PUN"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      belt_level: ["white", "yellow", "green", "blue", "red", "black"],
      division_move_policy: ["allow_move", "disqualify_only"],
      gender: ["male", "female"],
      match_lifecycle_state: [
        "AUTO_ADVANCE",
        "WAITING",
        "CONTEST",
        "IN_PROGRESS",
        "COMPLETED",
      ],
      match_status: ["pending", "in_progress", "completed"],
      payment_status: ["pending", "verified", "rejected"],
      tournament_status: [
        "upcoming",
        "registration_open",
        "registration_closed",
        "live",
        "completed",
      ],
      win_method: [
        "SCORE",
        "KO",
        "TKO",
        "DQ",
        "WITHDRAWAL",
        "FORFEIT",
        "PTF",
        "PTG",
        "GDP",
        "SUP",
        "RSC",
        "WDR",
        "DSQ",
        "PUN",
      ],
    },
  },
} as const
