export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          full_name: string | null
          avatar_url: string | null
          organization_name: string | null
          organization_type: string | null
          onboarding_completed: boolean
          role: 'tournament_organizer' | 'federation' | 'gym_owner' | 'school_admin' | 'other'
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          organization_name?: string | null
          organization_type?: string | null
          onboarding_completed?: boolean
          role?: 'tournament_organizer' | 'federation' | 'gym_owner' | 'school_admin' | 'other'
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          organization_name?: string | null
          organization_type?: string | null
          onboarding_completed?: boolean
          role?: 'tournament_organizer' | 'federation' | 'gym_owner' | 'school_admin' | 'other'
        }
      }
      tournaments: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          title: string
          description: string | null
          start_date: string
          end_date: string
          location: string
          max_participants: number | null
          registration_deadline: string | null
          status: 'draft' | 'published' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled'
          organizer_id: string
          registration_fee: number | null
          currency: string
          rules: string | null
          contact_email: string | null
          contact_phone: string | null
          website_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          title: string
          description?: string | null
          start_date: string
          end_date: string
          location: string
          max_participants?: number | null
          registration_deadline?: string | null
          status?: 'draft' | 'published' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled'
          organizer_id: string
          registration_fee?: number | null
          currency?: string
          rules?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          website_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          title?: string
          description?: string | null
          start_date?: string
          end_date?: string
          location?: string
          max_participants?: number | null
          registration_deadline?: string | null
          status?: 'draft' | 'published' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled'
          organizer_id?: string
          registration_fee?: number | null
          currency?: string
          rules?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          website_url?: string | null
        }
      }
      athletes: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          first_name: string
          last_name: string
          date_of_birth: string
          gender: 'male' | 'female' | 'other'
          belt_rank: string
          weight_class: string | null
          organization_id: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          medical_conditions: string | null
          status: 'active' | 'inactive' | 'suspended'
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          first_name: string
          last_name: string
          date_of_birth: string
          gender: 'male' | 'female' | 'other'
          belt_rank: string
          weight_class?: string | null
          organization_id: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          medical_conditions?: string | null
          status?: 'active' | 'inactive' | 'suspended'
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          first_name?: string
          last_name?: string
          date_of_birth?: string
          gender?: 'male' | 'female' | 'other'
          belt_rank?: string
          weight_class?: string | null
          organization_id?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          medical_conditions?: string | null
          status?: 'active' | 'inactive' | 'suspended'
        }
      }
      registrations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          tournament_id: string
          athlete_id: string
          registration_date: string
          status: 'pending' | 'confirmed' | 'cancelled' | 'refunded'
          payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_amount: number | null
          payment_currency: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          tournament_id: string
          athlete_id: string
          registration_date?: string
          status?: 'pending' | 'confirmed' | 'cancelled' | 'refunded'
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_amount?: number | null
          payment_currency?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          tournament_id?: string
          athlete_id?: string
          registration_date?: string
          status?: 'pending' | 'confirmed' | 'cancelled' | 'refunded'
          payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_amount?: number | null
          payment_currency?: string | null
          notes?: string | null
        }
      }
      organizations: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          type: 'taekwondo_gym' | 'tournament_organizer' | 'federation' | 'school' | 'other'
          description: string | null
          website_url: string | null
          contact_email: string | null
          contact_phone: string | null
          address: string | null
          owner_id: string
          status: 'active' | 'inactive' | 'suspended'
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          type: 'taekwondo_gym' | 'tournament_organizer' | 'federation' | 'school' | 'other'
          description?: string | null
          website_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          owner_id: string
          status?: 'active' | 'inactive' | 'suspended'
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          type?: 'taekwondo_gym' | 'tournament_organizer' | 'federation' | 'school' | 'other'
          description?: string | null
          website_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          owner_id?: string
          status?: 'active' | 'inactive' | 'suspended'
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Specific table types
export type Profile = Tables<'profiles'>
export type Tournament = Tables<'tournaments'>
export type Athlete = Tables<'athletes'>
export type Registration = Tables<'registrations'>
export type Organization = Tables<'organizations'>

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type TournamentInsert = Database['public']['Tables']['tournaments']['Insert']
export type AthleteInsert = Database['public']['Tables']['athletes']['Insert']
export type RegistrationInsert = Database['public']['Tables']['registrations']['Insert']
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type TournamentUpdate = Database['public']['Tables']['tournaments']['Update']
export type AthleteUpdate = Database['public']['Tables']['athletes']['Update']
export type RegistrationUpdate = Database['public']['Tables']['registrations']['Update']
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']
