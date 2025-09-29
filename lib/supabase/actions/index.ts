// Centralized export for all database queries
export { profileQueries } from './profiles';
export { tournamentQueries } from './tournaments';
export { teamQueries } from './teams';
export { athleteQueries } from './athletes';
export { registrationQueries } from './registrations';
export { divisionQueries } from './divisions';
export { paymentQueries } from './payments';

// Re-export types for convenience
export type {
  Profile,
  Tournament,
  Team,
  Athlete,
  TournamentRegistration,
  Division,
  DivisionParticipant,
  UserRole,
  TournamentStatus,
  BeltRank,
  Gender,
  PaymentStatus
} from '@/lib/types/database';

// Re-export payment types
export type { TeamPayment } from './payments';
