
import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { getTournamentMatches } from '@/lib/db/queries/matches'
import { PublicTournamentClient } from './public-tournament-client'

interface PublicTournamentPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function PublicTournamentPage({ params }: PublicTournamentPageProps) {
  const { id } = await params
  
  const [tournament, { data: participants }, matches] = await Promise.all([
    getTournamentById(id),
    getTournamentParticipants(id, { limit: 1000 }), // Get all participants
    getTournamentMatches(id)
  ])

  if (!tournament) {
    notFound()
  }

  // Ensure participants includes player and team objects as PublicTournamentClient expects
  // getTournamentParticipants already does this transformation in the query function

  return (
    <div className="min-h-screen bg-background">
      <PublicTournamentClient 
        tournament={tournament} 
        participants={participants} 
        matches={matches} 
      />
    </div>
  )
}
