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
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}



export default async function ParticipantsPage({ params, searchParams }: ParticipantsPageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  
  const page = Number(resolvedSearchParams?.page) || 1
  const limit = Number(resolvedSearchParams?.limit) || 10
  const query = resolvedSearchParams?.q as string
  const teamId = resolvedSearchParams?.team as string
  const belt = resolvedSearchParams?.belt as string
  const status = resolvedSearchParams?.status as string
  const weighInStatus = resolvedSearchParams?.weighIn as string
  const sort = resolvedSearchParams?.sort as string
  const order = resolvedSearchParams?.order as 'asc' | 'desc'

  const [tournament, participantsResult, teams] = await Promise.all([
    getTournamentById(id),
    getTournamentParticipants(id, {
      page,
      limit,
      query,
      teamId,
      belt,
      status,
      weighInStatus,
      sort,
      order
    }),
    getAllTeams()
  ])

  if (!tournament) {
    notFound()
  }

  return (
    <DashboardShell>
      <div className="mb-4">
        <Button variant="outline" asChild className="w-fit">
          <Link href={routes.organizer.tournamentDetail(id)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tournament
          </Link>
        </Button>
      </div>
      <PageHeader
        title="Participants"
        description="Manage registered teams and athletes."
      />
      <ParticipantList 
        participants={participantsResult.data as any} 
        count={participantsResult.count}
        page={participantsResult.page}
        limit={participantsResult.limit}
        totalPages={participantsResult.totalPages}
        tournamentId={id} 
        tournamentType={tournament.tournament_type}
        teams={teams} 
      />
    </DashboardShell>
  )
}
