
import { generateBracket } from '../lib/utils/bracket-generator';
import { calculateSchedule } from '../lib/utils/match-scheduler';
// import removed - debug script;

const mockConfig: any = {
  daily_start_time: '09:00',
  daily_end_time: '18:00',
  courts: 2,
  default_sparring_duration: 10,
  gradeschool_round_time: 60,
  gradeschool_kyeshi_time: 60,
  gradeschool_rest_between_rounds: 30,
  cadet_round_time: 90,
  cadet_kyeshi_time: 60,
  cadet_rest_between_rounds: 30,
  junior_round_time: 90,
  junior_kyeshi_time: 60,
  junior_rest_between_rounds: 30,
  senior_round_time: 120,
  senior_kyeshi_time: 60,
  senior_rest_between_rounds: 30,
  max_divisions_per_day: null,
  id: '',
  tournament_id: '',
  created_at: '',
  updated_at: '',
  days: 1,
  categories: [],
  default_poomsae_duration: null,
  default_breaking_duration: null
};

function runUnificationVerification() {
  console.log("=== Running Bracket <=> Scheduler Unification Test ===");

  // 1. Generate a 16-person bracket (White Belt)
  console.log("Step 1: Generating 16-person Bracket...");
  const participants = Array(16).fill(0).map((_, i) => ({
    id: `p${i + 1}`,
    team_id: `t${i + 1}`,
    player_id: `pl${i + 1}`
  }));

  const matches = generateBracket('tour1', participants);

  // Inspect Generated Metadata
  const r1Match = matches.find(m => m.round === 1);
  console.log(`Round 1 Sample: Name="${r1Match?.round_name}", Pos="${r1Match?.bracket_position}", Struct=${r1Match?.structural_match_number}`);

  if (r1Match?.round_name !== 'Round of 16') {
    console.error("❌ FAILED: Round 1 should be 'Round of 16'");
  } else {
    console.log("✅ Round naming correct");
  }

  // 2. Schedule
  console.log("Step 2: Scheduling matches...");

  // Tag matches with category info for the scheduler
  const enrichedMatches = matches.map(m => ({
    ...m,
    divisionId: 'div1',
    categoryId: 'cat1',
    belt_level: 'White', // Beginner Priority
    category_name: 'Men White',
    division_name: 'Senior',
    // Ensure status is compatible
    status: m.lifecycle_state === 'CONTEST' ? 'scheduled' : 'pending'
  }));

  const scheduleResult = await calculateSchedule({
    tournamentConfig: mockConfig,
    divisionConfigs: [],
    matches: enrichedMatches,
    startDate: new Date(, null as any),
    endDate: new Date()
  }, true);

  const assignments = scheduleResult.assignments;
  console.log(`Scheduled ${assignments.length} matches.`);

  // Verify Order:
  // We expect Round of 16 matches first (Seq 1-8 across courts)
  // Then Quarter-finals
  if (assignments.length === 0) {
    console.error("❌ No matches scheduled! Check filtering logic.");
    return;
  }

  const firstScheduled = enrichedMatches.find(m => m.id === assignments[0].matchId);
  console.log(`First scheduled match: ${firstScheduled?.round_name} (${firstScheduled?.bracket_position})`);

  if (firstScheduled?.round_name === 'Round of 16') {
    console.log("✅ Scheduler picked up Round of 16 first");
  } else {
    console.error(`❌ Scheduler Order Wrong. Expected Round of 16, got ${firstScheduled?.round_name}`);
  }
}

runUnificationVerification();
