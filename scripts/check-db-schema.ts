
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local manually since dotenv might not pick it up correctly with default options in all environments
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking schema for tournaments table...');

  // Try to infer from an insert error
  console.log('Attempting dry-run insert with array...');
  try {
    const { error: insertError } = await supabase.from('tournaments').insert({
      name: 'Test Schema Check',
      organizer_id: '00000000-0000-0000-0000-000000000000', // Fake ID, will fail FK likely, but type check comes first
      allowed_belt_groups: ['Test 1', 'Test 2'],
      status: 'cancelled'
    });

    if (insertError) {
      console.log('Insert Error:', insertError);
    } else {
      console.log('Insert Success (unexpected given fake FK, but means Type Check passed)');
    }

  } catch (e) {
    console.log('Insert Exception:', e);
  }
}

checkSchema();
