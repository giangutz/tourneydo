
import fs from 'fs';
import path from 'path';
import { calculateSchedule, assignMatchNumbers, ScheduleInput } from '../lib/utils/match-scheduler';
import { TournamentScheduleConfig, DivisionScheduleConfig } from '../types/models';

// --- MOCK DATA GENERATORS ---

const DIVISIONS = [
  { name: 'Gradeschool', ageRange: '6-12', duration: 10 },
  { name: 'Cadet', ageRange: '13-14', duration: 10 },
  { name: 'Junior', ageRange: '15-17', duration: 15 },
  { name: 'Senior', ageRange: '18-35', duration: 15 }
];

const BELTS = ['White', 'Yellow', 'Blue', 'Red', 'Black'];
const GENDERS = ['Male', 'Female'];
const WEIGHT_CLASSES = ['Fin', 'Fly', 'Bantam', 'Feather', 'Light', 'Welter', 'Middle', 'Heavy'];

function generateMockData(matchCount: number) {
  const tournamentConfig: TournamentScheduleConfig = {
    id: 'stress-test-config',
    tournament_id: 'stress-test-tournament',
    daily_start_time: '09:00',
    daily_end_time: '18:00', // 9 hours = 540 mins
    courts: 4,               // 4 courts * 540 = 2160 mins capacity per day
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const divisionConfigs: DivisionScheduleConfig[] = [];
  const matches: any[] = [];

  // We want to distribute 500 matches across these groups.
  // We'll create "Blocks" and assign matches to them.
  let currentMatchId = 1;

  // Create all combinations
  const combinations = [];
  for (const div of DIVISIONS) {
    for (const belt of BELTS) {
      for (const gender of GENDERS) {
        for (const weight of WEIGHT_CLASSES) {
          combinations.push({ div, belt, gender, weight });
        }
      }
    }
  }

  // Assign matches randomly to combinations
  for (let i = 0; i < matchCount; i++) {
    const combo = combinations[Math.floor(Math.random() * combinations.length)];

    const divId = `DIV-${combo.div.name}`;
    const catId = `CAT-${combo.gender}-${combo.weight}`;
    const groupId = `${divId}-${catId}`;

    // Ensure Div Config exists
    if (!divisionConfigs.find(d => d.division_id === divId && d.category_id === catId)) {
      divisionConfigs.push({
        id: `conf-${groupId}`,
        tournament_id: 'stress-test-tournament',
        division_id: divId,
        category_id: catId,
        priority: 1, // Will be overridden by logic if used, or defaults
        avg_match_duration: combo.div.duration,
        estimated_match_count: 0,
        estimated_total_minutes: 0,
        participant_count: 0,
        competition_type: 'sparring',
        scheduled_day: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // Create Match
    // We need round structure for realistic testing? 
    // Or just simple list. The scheduler sorts by Round inside blocks.
    // Let's assign random rounds 1-3 to simulate a bracket in progress or formed.
    const round = Math.floor(Math.random() * 3) + 1;

    matches.push({
      id: `M${currentMatchId++}`,
      divisionId: divId,
      categoryId: catId,
      round: round,
      status: 'pending',
      winner_id: null,
      belt_level: combo.belt,
      division_name: combo.div.name,
      category_name: `${combo.weight} Weight`,
      gender: combo.gender,
      player1_id: `P${Math.floor(Math.random() * 1000)}`, // Random players for recovery check
      player2_id: `P${Math.floor(Math.random() * 1000)}`,
      tournament_id: 'stress-test-tournament'
    });
  }

  return { tournamentConfig, divisionConfigs, matches };
}

// --- MAIN EXECUTION ---

async function runStressTest() {
  const MATCH_COUNT = 500;
  console.log(`Generating ${MATCH_COUNT} matches...`);

  const { tournamentConfig, divisionConfigs, matches } = generateMockData(MATCH_COUNT);

  const startDate = new Date('2024-06-01T00:00:00Z');
  const endDate = new Date('2024-06-05T00:00:00Z'); // 5 Days available

  const input: ScheduleInput = {
    tournamentConfig,
    divisionConfigs,
    matches,
    startDate,
    endDate
  };

  console.log('Running Scheduler...');
  const startTime = Date.now();

  // Phase 1 + 2 (Schedule + Numbering)
  const assignments = assignMatchNumbers(input);

  const duration = Date.now() - startTime;
  console.log(`Scheduling completed in ${duration}ms`);

  // --- ANALYSIS ---

  const reportPath = path.resolve(process.cwd(), 'scheduler_stress_report.md');
  const daysUsed = new Set(assignments.map(a => a.day)).size;
  const courtsUsed = new Set(assignments.map(a => a.court)).size;

  let report = `# Scheduler Stress Test Report

**Matches Scheduled**: ${assignments.length} / ${MATCH_COUNT} (Note: Overflow handled internally? Or returned partial? The util returns assignments. If strict, overflows skipped? No, strict usually returns overflow object. assignMatchNumbers wraps it and might filter? Check logic. Actually assignMatchNumbers returns assignments list. If overflow happens in calculateSchedule, they are in 'overflow' object not assignments list. We should check that.)

**Time Taken**: ${duration}ms
**Days Required**: ${daysUsed} days
**Courts Used**: ${courtsUsed} courts

## Schedule Breakdown

`;

  // Group by Day -> Court
  const scheduleMap = new Map<number, Map<number, any[]>>();

  assignments.forEach(a => {
    if (!scheduleMap.has(a.day)) scheduleMap.set(a.day, new Map());
    const dayMap = scheduleMap.get(a.day)!;
    if (!dayMap.has(a.court)) dayMap.set(a.court, []);
    dayMap.get(a.court)!.push(a);
  });

  // Sort Days
  const days = Array.from(scheduleMap.keys()).sort((a, b) => a - b);

  for (const day of days) {
    report += `### Day ${day}\n\n`;
    const dayMap = scheduleMap.get(day)!;
    const courts = Array.from(dayMap.keys()).sort((a, b) => a - b);

    for (const court of courts) {
      report += `#### Court ${court}\n\n`;
      report += `| Match # | Time | Division | Category | Belt | Round |\n`;
      report += `|---|---|---|---|---|---|\n`;

      const courtMatches = dayMap.get(court)!; // Already sorted by sequence in output usually

      // Need to find original match data for details like Belt
      for (const assign of courtMatches) {
        const original = matches.find(m => m.id === assign.matchId);
        report += `| **${assign.matchNumber}** | ${assign.estimatedStartTime} | ${original?.division_name} | ${original?.category_name} | ${original?.belt_level} | R${original?.round} |\n`;
      }
      report += `\n`;
    }
  }

  // Distribution Stats
  report += `\n## Distribution Stats\n\n`;
  const byBelt = matches.reduce((acc, m) => { acc[m.belt_level] = (acc[m.belt_level] || 0) + 1; return acc; }, {});
  report += `- **Belts**: ${JSON.stringify(byBelt)}\n`;

  fs.writeFileSync(reportPath, report);
  console.log(`Report saved to ${reportPath}`);
}

runStressTest();
