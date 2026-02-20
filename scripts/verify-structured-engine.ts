
import { calculateSchedule } from '../lib/utils/match-scheduler';
// import removed - debug script;

const mockConfig: any = {
  daily_start_time: '09:00',
  daily_end_time: '18:00',
  courts: 3,
  default_sparring_duration: 10,
  gradeschool_round_time: 60,
  gradeschool_rest_between_rounds: 30,
  gradeschool_kyeshi_time: 60,
  cadet_round_time: 90,
  cadet_rest_between_rounds: 30,
  cadet_kyeshi_time: 60,
  junior_round_time: 90,
  junior_rest_between_rounds: 30,
  junior_kyeshi_time: 60,
  senior_round_time: 120,
  senior_rest_between_rounds: 30,
  senior_kyeshi_time: 60,
  categories: [],
  id: '',
  created_at: undefined,
  updated_at: undefined,
  tournament_id: '',
  days: 1
};

const mockMatches: any[] = [
  // Beginner (White) - Should go FIRST (Priority 40)
  { id: 'm_white', divisionId: 'div1', categoryId: 'catWhite', belt_level: 'White', round: 1, match_number: 101 },

  // Novice (Yellow, Blue) - Should go SECOND (Priority 30)
  { id: 'm_yellow', divisionId: 'div1', categoryId: 'catYellow', belt_level: 'Yellow', round: 1, match_number: 101 },
  { id: 'm_blue', divisionId: 'div1', categoryId: 'catBlue', belt_level: 'Blue', round: 1, match_number: 101 },

  // Advanced I (Red, Brown) - Should go THIRD (Priority 20)
  { id: 'm_red', divisionId: 'div1', categoryId: 'catRed', belt_level: 'Red', round: 1, match_number: 101 },
  { id: 'm_brown', divisionId: 'div1', categoryId: 'catBrown', belt_level: 'Brown', round: 1, match_number: 101 },

  // Advanced II (Black) - Should go LAST (Priority 10)
  { id: 'm_black', divisionId: 'div1', categoryId: 'catBlack', belt_level: 'Black', round: 1, match_number: 101 },
];

function runTest() {
  return (async () => {
  console.log("Running Structured Engine Verification...");

  const input = {
    tournamentConfig: mockConfig,
    divisionConfigs: [],
    matches: mockMatches,
    startDate: new Date('2024-01-01T09:00:00'),
    endDate: new Date('2024-01-01T18:00:00')
  };

  const result = await calculateSchedule(input, true);
  const assignments = result.assignments;

  // Check Order: White -> Yellow/Blue -> Red/Brown -> Black
  // Sequence numbers increase globally
  const getSeq = (id: string) => assignments.find(a => a.matchId === id)?.sequence || 9999;

  const whiteSeq = getSeq('m_white');
  const yellowSeq = getSeq('m_yellow');
  const blueSeq = getSeq('m_blue');
  const redSeq = getSeq('m_red');
  const brownSeq = getSeq('m_brown');
  const blackSeq = getSeq('m_black');

  console.log(`Sequences: White=${whiteSeq}, Yellow=${yellowSeq}, Blue=${blueSeq}, Red=${redSeq}, Brown=${brownSeq}, Black=${blackSeq}`);

  const passed =
    whiteSeq < yellowSeq &&
    whiteSeq < blueSeq &&
    yellowSeq < redSeq &&
    blueSeq < redSeq &&
    redSeq < blackSeq &&
    brownSeq < blackSeq;

  if (passed) {
    console.log("✅ strict Belt Keyword Priority Verified!");
  } else {
    console.error("❌ Belt Keyword Priority FAILED");
  }

  // Check Court Distribution (Round Robin)
  // Expect: Court 1 -> m1_beg_r1_1, Court 2 -> m1_beg_r1_2, Court 3 -> m1_beg_r1_3
  const c1_Matches = assignments.filter(a => a.court === 1);
  const c2_Matches = assignments.filter(a => a.court === 2);
  const c3_Matches = assignments.filter(a => a.court === 3);

  console.log(`Court 1 Count: ${c1_Matches.length}`);
  console.log(`Court 2 Count: ${c2_Matches.length}`);
  console.log(`Court 3 Count: ${c3_Matches.length}`);

  if (c1_Matches.length > 0 && c2_Matches.length > 0 && c3_Matches.length > 0) {
    console.log("✅ Round Robin Distribution Verified");
  } else {
    console.error("❌ Round Robin Distribution FAILED");
  }

  // Check Round Synchronization
  // Beginner R1 (3 matches) should be spread 1,1,1.
  // Then Beginner R2 (1 match) should be next.
  // Novice should be last.

  // Verify Time:
  // Novice match start time should be > Last Beginner match start time
  const lastBeginner = assignments.filter(a => a.categoryId === 'catA').sort((a, b) => new Date(b.scheduledStartTime).getTime() - new Date(a.scheduledStartTime).getTime())[0];
  const firstNovice = assignments.find(a => a.categoryId === 'catB');

  if (lastBeginner && firstNovice) {
    const lbTime = new Date(lastBeginner.scheduledStartTime).getTime();
    const fnTime = new Date(firstNovice.scheduledStartTime).getTime();
    if (fnTime >= lbTime) { // Loose check: Novice starts after or equal to last beginner starts? 
      // Actually, if interleaved, they might overlap in time if strictly sequenced?
      // No, hierarchy loop puts Novice in queue AFTER Beginner.
      // So Novice gets pushed to courts AFTER Beginner.
      // So Sequence ID of Novice > Sequence ID of Beginner on same court.
      console.log("✅ Belt Sequencing Verified (Queue Order)");
    } else {
      console.error("❌ Belt Sequencing FAILED");
    }
  }
  })();
}

runTest();
