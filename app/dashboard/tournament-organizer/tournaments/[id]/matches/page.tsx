import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { getTournamentMatches } from '@/lib/db/queries/matches'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { BracketView } from '@/components/tournaments/bracket-view'
import { Card, CardContent } from '@/components/ui/card'

interface LiveBracketPageProps {
  params: Promise<{
    id: string
  }>
}

export const revalidate = 30 // Revalidate every 30 seconds

export default async function LiveBracketPage({ params }: LiveBracketPageProps) {
  const { id } = await params
  const [tournament, participants, matches] = await Promise.all([
    getTournamentById(id),
    getTournamentParticipants(id),
    getTournamentMatches(id)
  ])

  if (!tournament) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">{tournament.name}</h1>
        <p className="text-muted-foreground">Live Bracket Results</p>
      </div>

      <Card>
        <CardContent className="p-6 overflow-x-auto">
          {matches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Bracket has not been generated yet.
            </div>
          ) : (
            <BracketView 
              matches={matches} 
              participants={participants} 
              // No click handler for public view
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
