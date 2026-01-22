
import { assignMatchNumbers, ScheduleInput } from './lib/utils/match-scheduler';
import { TournamentScheduleConfig, DivisionScheduleConfig } from './types/models';

// Mock Config
const tournamentConfig: TournamentScheduleConfig = {
  id: 'test-tourney',
  tournament_id: 'test-tourney',
  courts: 2,
  daily_start_time: '09:00',
  daily_end_time: '12:00', // 3 hours per day = 180 min * 2 courts = 360 min capacity
  default_sparring_duration: 10,
  gradeschool_round_time: null,
  gradeschool_kyeshi_time: null,
  gradeschool_rest_between_rounds: null,
  cadet_round_time: null,
  cadet_kyeshi_time: null,
  cadet_rest_between_rounds: null,
  junior_round_time: null,
  junior_kyeshi_time: null,
  junior_rest_between_rounds: null,
  senior_round_time: null,
  senior_kyeshi_time: null,
  senior_rest_between_rounds: null,
  default_poomsae_duration: null,
  default_breaking_duration: null,
  max_divisions_per_day: null,
  created_at: null,
  updated_at: null
};

// Mock Divisions
// Division A: Advanced (Priority 1)
// Division B: Beginner (Priority 2)
const divisionConfigs: DivisionScheduleConfig[] = [
  {
    id: 'div_1',
    division_id: 'div_advanced',
    priority: 1,
    avg_match_duration: 20,
    tournament_id: 'test-tourney',
    category_id: 'cat1',
    competition_type: 'sparring',
    participant_count: 8,
    estimated_match_count: 7,
    estimated_total_minutes: 140,
    scheduled_day: null,
    created_at: null,
    updated_at: null
  },
  {
    id: 'div_2',
    division_id: 'div_beginner',
    priority: 2,
    avg_match_duration: 10,
    tournament_id: 'test-tourney',
    category_id: 'cat2',
    competition_type: 'sparring',
    participant_count: 8,
    estimated_match_count: 7,
    estimated_total_minutes: 70,
    scheduled_day: null,
    created_at: null,
    updated_at: null
  }
];

// Mock Matches
// Advanced: 4 matches in R1, 2 in R2
// Beginner: 4 matches in R1
const matches = [
  // Round 1 Advanced
  { id: 'adv_r1_1', divisionId: 'div_advanced', categoryId: 'cat1', round: 1 },
  { id: 'adv_r1_2', divisionId: 'div_advanced', categoryId: 'cat1', round: 1 },
  { id: 'adv_r1_3', divisionId: 'div_advanced', categoryId: 'cat1', round: 1 },
  { id: 'adv_r1_4', divisionId: 'div_advanced', categoryId: 'cat1', round: 1 },
  // Round 2 Advanced
  { id: 'adv_r2_1', divisionId: 'div_advanced', categoryId: 'cat1', round: 2 },
  { id: 'adv_r2_2', divisionId: 'div_advanced', categoryId: 'cat1', round: 2 },

  // Round 1 Beginner
  { id: 'beg_r1_1', divisionId: 'div_beginner', categoryId: 'cat2', round: 1 },
  { id: 'beg_r1_2', divisionId: 'div_beginner', categoryId: 'cat2', round: 1 },
  { id: 'beg_r1_3', divisionId: 'div_beginner', categoryId: 'cat2', round: 1 },
  { id: 'beg_r1_4', divisionId: 'div_beginner', categoryId: 'cat2', round: 1 },
];

const input: ScheduleInput = {
  tournamentConfig,
  divisionConfigs,
  matches,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-02')
};

console.log('Running Scheduler Verification...');
const assignments = assignMatchNumbers(input);

// Sort by Day, Court, Sequence for readability
assignments.sort((a, b) => {
  if (a.day !== b.day) return a.day - b.day;
  if (a.court !== b.court) return a.court - b.court;
  return a.sequence - b.sequence;
});

console.log('Assignment Results:');
console.table(assignments.map(a => ({
  match: a.matchId,
  num: a.matchNumber,
  day: a.day,
  court: a.court,
  time: a.estimatedStartTime,
  div: a.divisionId
})));

// Validations
console.log('\nValidations:');

// 1. Check Sort Order (Advanced R1 should be first, then Beginner R1, then Advanced R2)
// Since we are using breadth-first across courts, the absolute time order is what matters.
// Advanced R1 (20min) should be scheduled first.
// Beginner R1 (10min) should be scheduled next (since R1 < R2 priority rule? Wait, let's check code).
// Code says: 
// Priority 1: Round ASC
// Priority 2: Division Priority ASC (lower is better)
// So order should be: Round 1 (Adv, then Beg), then Round 2 (Adv).

const advR1 = assignments.filter(a => a.matchId.startsWith('adv_r1'));
const begR1 = assignments.filter(a => a.matchId.startsWith('beg_r1'));
const advR2 = assignments.filter(a => a.matchId.startsWith('adv_r2'));

const lastAdvR1Start = new Date(advR1[advR1.length - 1].scheduledStartTime).getTime();
const firstBegR1Start = new Date(begR1[0].scheduledStartTime).getTime();
const lastBegR1Start = new Date(begR1[begR1.length - 1].scheduledStartTime).getTime();
const firstAdvR2Start = new Date(advR2[0].scheduledStartTime).getTime();

// Note: With breadth-first, they might overlap in time across courts.
// But mostly Adv R1 should be allocated first.

console.log(`Adv R1 count: ${advR1.length}`);
console.log(`Beg R1 count: ${begR1.length}`);
console.log(`Adv R2 count: ${advR2.length}`);

// Check interleaved logic
// If Adv R1 takes slots, subsequent slots should be Beg R1.
