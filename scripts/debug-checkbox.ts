
import { z } from 'zod';

// Replicate schema from lib/validations/tournament.ts
const tournamentFormSchema = z.object({
  allowed_belt_groups: z.preprocess(
    (val) => {
      console.log('Preprocess Input:', typeof val, val);
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          console.log('Parsed JSON:', parsed);
          return parsed;
        } catch (e) {
          console.log('JSON parse failed, returning original');
          return val;
        }
      }
      return val;
    },
    z.array(z.string()).optional()
  ),
});

async function run() {
  console.log('--- Test 1: Single Selection ---');
  // Simulation of: formData.append('allowed_belt_groups', '["Beginner"]')
  const formData1 = new FormData();
  formData1.append('allowed_belt_groups', JSON.stringify(['Beginner']));

  const rawData1: any = Object.fromEntries(formData1 as any);
  // Node FormData might differ slightly in types but Object.fromEntries is standard

  // Logic from lib/actions/tournaments.ts
  const beltGroups1 = formData1.getAll('allowed_belt_groups');
  if (beltGroups1.length > 0) {
    if (beltGroups1.length > 1) {
      rawData1.allowed_belt_groups = beltGroups1;
    } else if (beltGroups1.length === 1) {
      const val = beltGroups1[0];
      if (typeof val === 'string' && !val.trim().startsWith('[')) {
        rawData1.allowed_belt_groups = [val];
      }
    }
  }

  console.log('Raw Data 1:', rawData1);
  const result1 = tournamentFormSchema.safeParse(rawData1);
  console.log('Result 1 Success:', result1.success);
  if (!result1.success) console.log('Result 1 Error:', result1.error);


  console.log('\n--- Test 2: Multiple Selection ---');
  // Simulation of: formData.append('allowed_belt_groups', '["Beginner", "Advanced"]')
  const formData2 = new FormData();
  formData2.append('allowed_belt_groups', JSON.stringify(['Beginner', 'Advanced']));

  const rawData2: any = Object.fromEntries(formData2 as any);

  const beltGroups2 = formData2.getAll('allowed_belt_groups');
  if (beltGroups2.length > 0) {
    if (beltGroups2.length > 1) {
      rawData2.allowed_belt_groups = beltGroups2;
    } else if (beltGroups2.length === 1) {
      const val = beltGroups2[0];
      if (typeof val === 'string' && !val.trim().startsWith('[')) {
        rawData2.allowed_belt_groups = [val];
      }
    }
  }

  console.log('Raw Data 2:', rawData2);
  const result2 = tournamentFormSchema.safeParse(rawData2);
  console.log('Result 2 Success:', result2.success);
  if (!result2.success) console.log('Result 2 Error:', result2.error);
}

run();
