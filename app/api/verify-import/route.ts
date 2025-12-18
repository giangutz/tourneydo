import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  const { data, error } = await supabase
    .from('players')
    .select('first_name, last_name, weight, height, belt_level, dob, gender')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ players: data })
}
