import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { getMatchesWithReadiness } from '@/lib/db/queries/match-readiness'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/config/routes'
import { CourtManager } from '@/components/tournaments/court-manager'

interface TournamentCourtsPageProps {
  params: Promise<{
    id: string
  }>
}

import { TournamentBreadcrumbs } from '@/components/tournaments/tournament-breadcrumbs'

export default async function TournamentCourtsPage({ params }: TournamentCourtsPageProps) {
  const { id } = await params
  const tournament = await getTournamentById(id)

  if (!tournament) {
    notFound()
  }

  const { data: participants } = await getTournamentParticipants(id, { limit: 1000 })
  const matches = await getMatchesWithReadiness(id)

  return (
    <DashboardShell>
      <TournamentBreadcrumbs tournamentName={tournament.name} tournamentId={tournament.id} pageName="Courts" hideParent />
      <PageHeader
        title="Courts"
        description={`Manage courts for ${tournament.name}`}
        action={
          <Button variant="outline" asChild>
            <Link href={routes.organizer.tournamentDetail(tournament.id)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        }
      />

      <CourtManager tournament={tournament} matches={matches} participants={participants} />
    </DashboardShell>
  )
}
