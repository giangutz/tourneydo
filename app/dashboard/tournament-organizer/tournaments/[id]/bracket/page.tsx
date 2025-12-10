import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { getTournamentMatches } from '@/lib/db/queries/matches'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/config/routes'
import { BracketView } from '@/components/tournaments/bracket-view'
import { BracketPageClient } from '@/components/tournaments/bracket-page-client'

interface BracketPageProps {
  params: Promise<{
    id: string
  }>
}

import { TournamentBreadcrumbs } from '@/components/tournaments/tournament-breadcrumbs'

export default async function BracketPage({ params }: BracketPageProps) {
  const { id } = await params
  const [tournament, { data: participants }, matches] = await Promise.all([
    getTournamentById(id),
    getTournamentParticipants(id, { limit: 1000 }),
    getTournamentMatches(id)
  ])

  if (!tournament) {
    notFound()
  }

  return (
    <DashboardShell>
      <TournamentBreadcrumbs tournamentName={tournament.name} tournamentId={tournament.id} pageName="Bracket" hideParent />
      <PageHeader
        title="Bracket"
        description="Manage tournament bracket and results."
        action={
          <Button variant="outline" asChild>
            <Link href={routes.organizer.tournamentDetail(id)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tournament
            </Link>
          </Button>
        }
      />
      <BracketPageClient 
        tournament={tournament} 
        participants={participants} 
        matches={matches} 
      />
    </DashboardShell>
  )
}
