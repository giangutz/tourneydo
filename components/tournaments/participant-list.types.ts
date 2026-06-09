// Types for the ParticipantList component.
// Kept collocated since these types are local to this feature
// and not shared across the application.

import type { Team } from '@/types/models'

export interface Participant {
  id: string
  tournament_id: string
  status: 'pending' | 'verified' | 'paid'
  actual_weight: number | null
  actual_height: number | null
  disqualified: boolean
  disqualification_reason: string | null
  weighed_in_at: string | null
  created_at: string
  player: {
    id: string
    first_name: string
    last_name: string
    email: string | null
    belt_level: string | null
    weight: number | null
    height: number | null
    dob: string
    gender: 'male' | 'female'
  }
  team: {
    name: string
  }
  division_id?: string | null
  category_id?: string | null
  weighed_in_by_user?: {
    first_name: string | null
    last_name: string | null
  } | null
  tournament_divisions?: {
    id: string
    name: string
  } | null
  tournament_categories?: {
    id: string
    name: string
    gender: string
    min_weight: number | null
    max_weight: number | null
    min_height: number | null
    max_height: number | null
  } | null
}

export interface ParticipantListProps {
  participants: Participant[]
  count: number
  page: number
  limit: number
  totalPages: number
  tournamentId: string
  tournamentType?: 'standard' | 'open-belt'
  teams: Team[]
}
