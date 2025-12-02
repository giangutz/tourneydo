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

import { TournamentBreadcrumbs } from '@/components/tournaments/tournament-breadcrumbs'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/config/routes'

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
    <DashboardShell>
      <TournamentBreadcrumbs tournamentName={tournament.name} tournamentId={tournament.id} pageName="Matches" hideParent />
      <PageHeader
        title="Matches"
        description="Live match console and results."
        action={
          <Button variant="outline" asChild>
            <Link href={routes.organizer.tournamentDetail(id)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tournament
            </Link>
          </Button>
        }
      />

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
    </DashboardShell>
  )
}
