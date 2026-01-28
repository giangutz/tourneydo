
import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { getTournamentMatches } from '@/lib/db/queries/matches'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { PublicTournamentClient } from './public-tournament-client'
import { SiteHeader } from '@/components/layouts/site-header'

export const revalidate = 0
export const dynamic = 'force-dynamic'

interface PublicTournamentPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function PublicTournamentPage({ params }: PublicTournamentPageProps) {
  const { id } = await params
  const supabaseAdmin = createServiceSupabaseClient()
  
  const [tournament, { data: participants }, matches] = await Promise.all([
    getTournamentById(id),
    getTournamentParticipants(id, { limit: 1000 }, supabaseAdmin), // Use admin client to bypass RLS for public view
    getTournamentMatches(id)
  ])

  if (!tournament) {
    notFound()
  }

  // Ensure participants includes player and team objects as PublicTournamentClient expects
  // getTournamentParticipants already does this transformation in the query function

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <PublicTournamentClient 
        tournament={tournament} 
        participants={participants} 
        matches={matches} 
      />
    </div>
  )
}
