import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { getAllTeams } from '@/lib/db/queries/teams'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { ParticipantList } from '@/components/tournaments/participant-list'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/config/routes'

interface ParticipantsPageProps {
  params: Promise<{
    id: string
  }>
}

import { TournamentBreadcrumbs } from '@/components/tournaments/tournament-breadcrumbs'

export default async function ParticipantsPage({ params }: ParticipantsPageProps) {
  const { id } = await params
  const [tournament, participants, teams] = await Promise.all([
    getTournamentById(id),
    getTournamentParticipants(id),
    getAllTeams()
  ])

  if (!tournament) {
    notFound()
  }

  return (
    <DashboardShell>
      <TournamentBreadcrumbs tournamentName={tournament.name} tournamentId={tournament.id} pageName="Participants" hideParent />
      <PageHeader
        title="Participants"
        description="Manage registered teams and athletes."
        action={
          <Button variant="outline" asChild>
            <Link href={routes.organizer.tournamentDetail(id)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tournament
            </Link>
          </Button>
        }
      />
      <ParticipantList 
        participants={participants as any} 
        tournamentId={id} 
        tournamentType={tournament.tournament_type}
        teams={teams} 
      />
    </DashboardShell>
  )
}
