import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  // Get the most recent tournament
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, entry_fee')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!tournament) {
    return Response.json({ error: 'No tournament found' }, { status: 404 })
  }

  // Count registrations for this tournament
  const { count, error } = await supabase
    .from('tournament_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournament.id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({
    tournament: tournament.name,
    tournamentId: tournament.id,
    entryFee: tournament.entry_fee,
    totalRegistrations: count,
    projectedRevenue: (count || 0) * (tournament.entry_fee || 0)
  })
}
