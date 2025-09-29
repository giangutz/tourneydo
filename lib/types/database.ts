export type UserRole = 'organizer' | 'coach' | 'athlete';
export type TournamentStatus = 'draft' | 'registration_open' | 'registration_closed' | 'weigh_in' | 'in_progress' | 'completed' | 'cancelled';
export type BeltRank = 'white' | 'yellow' | 'blue' | 'red' | 'brown' | 'black';
export type Gender = 'male' | 'female';
export type PaymentStatus = 'pending' | 'pending_approval' | 'approved' | 'rejected' | 'paid' | 'refunded';
export type MatchStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Profile {
  id: string; // UUID
  clerk_id: string; // Clerk user ID
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  organization?: string;
  avatar_url?: string;
  bio?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tournament {
  id: string;
  organizer_id: string; // UUID reference to profiles
  name: string;
  description?: string;
  location: string;
  tournament_date: string;
  registration_deadline: string;
  weigh_in_date: string;
  entry_fee: number;
  status: TournamentStatus;
  max_participants?: number;
  rules?: string;
  contact_email?: string;
  contact_phone?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  organizer?: Profile;
}

export interface Team {
  id: string;
  coach_id: string; // UUID reference to profiles
  name: string;
  organization?: string;
  description?: string;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  coach?: Profile;
  athletes?: Athlete[];
}

export interface Athlete {
  id: string;
  profile_id?: string; // UUID reference to profiles
  team_id?: string; // UUID reference to teams
  full_name: string;
  email?: string;
  date_of_birth: string;
  gender: Gender;
  belt_rank: BeltRank;
  weight?: number;
  height?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_conditions?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  team?: Team;
}

export interface TournamentRegistration {
  id: string;
  tournament_id: string;
  athlete_id: string;
  team_id?: string;
  registration_date: string;
  payment_status: PaymentStatus;
  payment_amount?: number;
  payment_reference?: string;
  notes?: string;
  checked_in: boolean;
  check_in_time?: string;
  weighed_in: boolean;
  weigh_in_time?: string;
  weight_recorded?: number;
  height_recorded?: number;
  created_at: string;
  updated_at: string;
  tournament?: Tournament;
  athlete?: Athlete;
  team?: Team;
}

export interface Division {
  id: string;
  tournament_id: string;
  name: string;
  category: string;
  gender: Gender;
  min_age: number;
  max_age: number;
  min_weight?: number;
  max_weight?: number;
  min_height?: number;
  max_height?: number;
  belt_rank_min?: BeltRank;
  belt_rank_max?: BeltRank;
  max_participants: number;
  participant_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tournament?: Tournament;
  participants?: DivisionParticipant[];
}

export interface DivisionParticipant {
  id: string;
  division_id: string;
  athlete_id: string;
  registration_id: string;
  seed_number?: number;
  assigned_at: string;
  assigned_by?: string;
  division?: Division;
  athlete?: Athlete;
  registration?: TournamentRegistration;
}

export interface Bracket {
  id: string;
  division_id: string;
  bracket_type: string;
  total_rounds: number;
  created_at: string;
  updated_at: string;
  division?: Division;
  matches?: Match[];
}

export interface Match {
  id: string;
  bracket_id: string;
  round_number: number;
  match_number: number;
  participant1_id?: string;
  participant2_id?: string;
  winner_id?: string;
  participant1_score: number;
  participant2_score: number;
  status: MatchStatus;
  scheduled_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  bracket?: Bracket;
  participant1?: DivisionParticipant;
  participant2?: DivisionParticipant;
  winner?: DivisionParticipant;
}

export interface TournamentResult {
  id: string;
  tournament_id: string;
  division_id: string;
  athlete_id: string;
  placement: number;
  medal_type?: string;
  created_at: string;
}

export interface Member {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role: "admin" | "bracket_manager" | "standard_member";
  status: "active" | "inactive";
  organizer_id: string; // The organizer who manages this member
  created_at: string;
  updated_at: string;
}

export interface TournamentMember {
  id: string;
  tournament_id: string;
  member_id: string;
  role: "admin" | "bracket_manager" | "standard_member";
  assigned_at: string;
  assigned_by: string; // User ID who assigned this member
}

export interface RegisterAthleteData {
  athlete_id: string;
  tournament_id: string;
  team_id?: string;
  notes?: string;
}

export interface CreateAthleteData {
  full_name: string;
  date_of_birth: string;
  gender: Gender;
  belt_rank: BeltRank;
  weight_class?: number;
  height?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_conditions?: string;
}

// Age calculation helper
export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Belt rank ordering for comparisons
export const BELT_RANK_ORDER: Record<BeltRank, number> = {
  white: 1,
  yellow: 2,
  blue: 3,
  red: 4,
  brown: 5,
  black: 6,
};

export function compareBeltRanks(rank1: BeltRank, rank2: BeltRank): number {
  return BELT_RANK_ORDER[rank1] - BELT_RANK_ORDER[rank2];
}
