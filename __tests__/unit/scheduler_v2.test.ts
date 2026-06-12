
import { calculateSchedule, assignMatchNumbers, ScheduleInput } from '@/lib/utils/match-scheduler';
import { TournamentScheduleConfig, DivisionScheduleConfig } from '@/types/models';

describe('Strict WT Scheduler Upgraded', () => {
  const mockTournamentConfig: TournamentScheduleConfig = {
    id: 'config1',
    tournament_id: 't1',
    daily_start_time: '09:00',
    daily_end_time: '18:00', // 09:00 - 18:00 (540 mins)
    courts: 1, // Single court for easier testing constraints
    gradeschool_round_time: 90,
    gradeschool_kyeshi_time: 60,
    gradeschool_rest_between_rounds: 30,
    cadet_round_time: 90,
    cadet_kyeshi_time: 60,
    cadet_rest_between_rounds: 30,
    junior_round_time: 120,
    junior_kyeshi_time: 60,
    junior_rest_between_rounds: 30,
    senior_round_time: 120,
    senior_kyeshi_time: 60,
    senior_rest_between_rounds: 30,
    default_sparring_duration: 10,
    default_poomsae_duration: 10,
    default_breaking_duration: 10,
    max_divisions_per_day: null,
    lunch_enabled: true,
    lunch_start_time: '12:00',
    lunch_end_time: '13:00',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockDivisionConfig: DivisionScheduleConfig = {
    id: 'divConfig1',
    tournament_id: 't1',
    division_id: 'd1',
    category_id: 'c1',
    priority: 1,
    avg_match_duration: 10,
    estimated_match_count: 10,
    estimated_total_minutes: 100,
    participant_count: 10,
    competition_type: 'sparring',
    scheduled_day: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const createMatch = (id: string, divId: string, catId: string, round: number, belt: string, gender: string, duration = 10) => ({
    id,
    divisionId: divId,
    categoryId: catId,
    round,
    // The scheduler only schedules CONTEST-ready matches (it skips 'pending' and
    // 'completed') and buckets them by round_name. The bracket generator always
    // sets these; the fixture must too, or nothing schedules.
    round_name: 'Finals',
    status: 'scheduled',
    winner_id: null,
    belt_level: belt,
    gender,
    division_name: 'Test Div',
    category_name: 'Test Cat',
    player1_id: 'p1',
    player2_id: 'p2',
    // Mock fields
    tournament_id: 't1',
    match_number: 0,
    score_player1: 0,
    score_player2: 0,
    score_round1_player1: 0,
    score_round1_player2: 0,
    score_round2_player1: 0,
    score_round2_player2: 0,
    score_round3_player1: 0,
    score_round3_player2: 0,
    created_at: '',
    updated_at: ''
  });

  const baseInput: ScheduleInput = {
    tournamentConfig: mockTournamentConfig,
    divisionConfigs: [mockDivisionConfig],
    matches: [],
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-02') // 2 Days
  };

  test('Lunch Break: Enforce 12:00-13:00 gap', () => {
    // 09:00 Start. 12:00 (180 mins) is Lunch.
    // Create matches that fill the morning and overflow into lunch.
    // 19 matches of 10 mins = 190 mins.
    // 18 Matches -> 180 mins (Ends exactly at 12:00).
    // 19th Match -> Should be pushed to 13:00 (240 mins).

    // We strictly use Court 1.
    const matches = Array.from({ length: 20 }, (_, i) =>
      createMatch(`M${i}`, 'D1', 'C1', 1, 'Black', 'M')
    );

    // Config: 1 Court.

    const input = { ...baseInput, matches };
    const { assignments } = calculateSchedule(input);

    // Sort by time
    assignments.sort((a, b) => new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime());

    // Find the gap
    let lunchGapFound = false;
    for (let i = 0; i < assignments.length - 1; i++) {
      const currEnd = new Date(assignments[i].scheduledEndTime);
      const nextStart = new Date(assignments[i + 1].scheduledStartTime);

      // Check if currEnd is 12:00 (local) and nextStart is 13:00 (local)
      // Or gap >= 60 mins around noon
      // Simplest check: No match starts between 12:00 and 12:59
      // 12:00 PM is 3 hours after 9:00 AM start.

      const diff = (nextStart.getTime() - currEnd.getTime()) / (1000 * 60);
      if (diff >= 60) {
        const h = currEnd.getHours(); // Local test runner time... careful with TZ.
        // Rely on `estimatedStartTime` string in assignment which is formatted HH:MM AM/PM
        // 12:00 PM
        const timeStr = assignments[i].estimatedStartTime; // Start time of pre-lunch
        // We want to check scheduled times.
        // If gap is 60 mins, likely lunch.
        lunchGapFound = true;
      }
    }

    // Specific constrained check:
    // Match 18 (index 17) should end at 12:00.
    // Match 19 (index 18) should start at 1:00 PM (13:00).
    // Assuming 10 min duration.
    // 09:00 + 180m = 12:00.
    // 09:00 + 10m = 09:10

    // Check specific string formats
    // We expect NO match to contain "12:xx PM" as start time.
    const matchDuringLunch = assignments.find(a => a.estimatedStartTime.startsWith("12:"));
    expect(matchDuringLunch).toBeUndefined();

    expect(assignments.length).toBe(20);
  });

  test('Strict Belt Priority: Beginner R16 vs Novice R64 (No Urgency Override)', () => {
    // Create two blocks.
    // Block A: Beginner (White), R16 (Low Urgency, but Lowest Belt=10)
    // Block B: Novice (Yellow), R64 (High Urgency, but Higher Belt=20)
    // Old Rule: Urgency swap.
    // New Rule (Strict): Belt 10 < Belt 20. Beginner goes first.

    // Setup
    const matchesBeginner = Array.from({ length: 8 }, (_, i) => createMatch(`Beg${i}`, 'D-Beg', 'C1', 1, 'White', 'M'));
    const matchesNovice = Array.from({ length: 32 }, (_, i) => createMatch(`Nov${i}`, 'D-Nov', 'C1', 1, 'Novice', 'M'));

    const input = { ...baseInput, matches: [...matchesBeginner, ...matchesNovice] };
    const { assignments } = calculateSchedule(input);

    // We expect Beginner (White/10) to run BEFORE Novice (Yellow/20) despite Novice being huge
    const firstBeg = assignments.find(m => m.divisionId === 'D-Beg');
    const firstNov = assignments.find(m => m.divisionId === 'D-Nov');

    const tBeg = new Date(firstBeg!.scheduledStartTime).getTime();
    const tNov = new Date(firstNov!.scheduledStartTime).getTime();

    expect(tBeg).toBeLessThan(tNov);
  });

  test('BlockSet Affinity: Group similar belts together', () => {
    // Create two sets of blocks.
    // Set A: Novice I (Yellow) - Fin (10 matches), Fly (10 matches)
    // Set B: Novice II (Green) - Fin (10 matches), Fly (10 matches)
    // Belt Priority: Yellow(20) < Green(30).
    // Urgency is similar.
    // Expected: Yellow Fin & Yellow Fly come BEFORE Green Fin & Green Fly.
    // AND they should be grouped: [Y-Fin, Y-Fly] then [G-Fin, G-Fly] (or similar order).
    // Interleaving (Y-Fin, G-Fin, Y-Fly, G-Fly) would be bad.

    const setA_1 = Array.from({ length: 5 }, (_, i) => createMatch(`A1_${i}`, 'Div-Y', 'Cat-Fin', 1, 'Yellow', 'M'));
    const setA_2 = Array.from({ length: 5 }, (_, i) => createMatch(`A2_${i}`, 'Div-Y', 'Cat-Fly', 1, 'Yellow', 'M'));

    const setB_1 = Array.from({ length: 5 }, (_, i) => createMatch(`B1_${i}`, 'Div-G', 'Cat-Fin', 1, 'Green', 'M'));
    const setB_2 = Array.from({ length: 5 }, (_, i) => createMatch(`B2_${i}`, 'Div-G', 'Cat-Fly', 1, 'Green', 'M'));

    const matches = [...setA_1, ...setA_2, ...setB_1, ...setB_2];

    const input = { ...baseInput, matches };
    const { assignments } = calculateSchedule(input);

    // Indices
    const idxA1 = assignments.findIndex(m => m.divisionId === 'Div-Y' && m.categoryId === 'Cat-Fin');
    const idxA2 = assignments.findIndex(m => m.divisionId === 'Div-Y' && m.categoryId === 'Cat-Fly');
    const idxB1 = assignments.findIndex(m => m.divisionId === 'Div-G' && m.categoryId === 'Cat-Fin');
    const idxB2 = assignments.findIndex(m => m.divisionId === 'Div-G' && m.categoryId === 'Cat-Fly');

    // Determine average position of Set A vs Set B
    const avgA = (idxA1 + idxA2) / 2;
    const avgB = (idxB1 + idxB2) / 2;

    // Set A (Yellow) should be earlier than Set B (Green)
    expect(avgA).toBeLessThan(avgB);

    // Verify Contiguity? 
    // We expect indices to be clustered. e.g. 0,1,2... for A, then B.
    // Since they are small blocks and fit on one court, they should be sequenced.
    // Yellows should be assigned before Greens.

    // Check start times
    const startA1 = new Date(assignments[idxA1].scheduledStartTime).getTime();
    const startB1 = new Date(assignments[idxB1].scheduledStartTime).getTime();

    expect(startA1).toBeLessThan(startB1);
  });

  test('Strict Belt Priority: Large Advanced vs Small Novice', () => {
    // Scenario: User complaint "Advanced appeared before Novice".
    // Even if Advanced is Huge (High Urgency) and Novice is Small, 
    // Novice MUST come first if we enforce Belt Priority.

    // 40 Matches for Advanced (Black/40) -> High Urgency
    const matchesAdvanced = Array.from({ length: 40 }, (_, i) =>
      createMatch(`Adv${i}`, 'Div-Adv', 'Cat-Adv', 1, 'Black', 'M')
    );

    // 10 Matches for Novice (Yellow/20) -> Low Urgency
    const matchesNovice = Array.from({ length: 10 }, (_, i) =>
      createMatch(`Nov${i}`, 'Div-Nov', 'Cat-Nov', 1, 'Yellow', 'M')
    );

    const matches = [...matchesAdvanced, ...matchesNovice];
    const input = { ...baseInput, matches };

    const { assignments } = calculateSchedule(input);

    const firstNov = assignments.find(m => m.divisionId === 'Div-Nov');
    const firstAdv = assignments.find(m => m.divisionId === 'Div-Adv');

    const tNov = new Date(firstNov!.scheduledStartTime).getTime();
    const tAdv = new Date(firstAdv!.scheduledStartTime).getTime();

    // Expect Novice (Yellow) to appear BEFORE Advanced (Black) despite size difference
    expect(tNov).toBeLessThan(tAdv);
  });
  test('Consistent Block Sequencing: Prevent Interleaving and Enforce Top-Down', () => {
    // Scenario: Two equal blocks (Same Belt, Same Urgency).
    // Block A: 6 matches. Block B: 6 matches.
    // Should sequence Block A matches (101, 201...) then Block B.
    // Matches within Block A should follow insertion order (1->top, 2->bottom).

    const matchesA = Array.from({ length: 6 }, (_, i) =>
      createMatch(`A_${i}`, 'Div-Eq', 'Cat-A', 1, 'Yellow', 'M')
    );
    // Matches B come AFTER in input array -> Should come AFTER in schedule if tied.
    const matchesB = Array.from({ length: 6 }, (_, i) =>
      createMatch(`B_${i}`, 'Div-Eq', 'Cat-B', 1, 'Yellow', 'M')
    );

    const matches = [...matchesA, ...matchesB];
    const input = { ...baseInput, matches };

    const { assignments } = calculateSchedule(input);

    // 1. Verify Block A matches are scheduled generally before Block B matches?
    // Or at least clumped.
    const assignedA = assignments.filter(m => m.categoryId === 'Cat-A');
    const assignedB = assignments.filter(m => m.categoryId === 'Cat-B');

    // Check average start time
    const avgTimeA = assignedA.reduce((sum, m) => sum + new Date(m.scheduledStartTime).getTime(), 0) / 6;
    const avgTimeB = assignedB.reduce((sum, m) => sum + new Date(m.scheduledStartTime).getTime(), 0) / 6;

    expect(avgTimeA).toBeLessThan(avgTimeB);

    // 2. Verify Internal Order (Source Index)
    // A_0 (Top) should be sched before A_5 (Bottom)
    const tA0 = new Date(assignedA.find(m => m.matchId === 'A_0')!.scheduledStartTime).getTime();
    const tA5 = new Date(assignedA.find(m => m.matchId === 'A_5')!.scheduledStartTime).getTime();
    expect(tA0).toBeLessThanOrEqual(tA5);
  });
});
