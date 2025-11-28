import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
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

export default async function ParticipantsPage({ params }: ParticipantsPageProps) {
  const { id } = await params
  const [tournament, participants] = await Promise.all([
    getTournamentById(id),
    getTournamentParticipants(id)
  ])

  if (!tournament) {
    notFound()
  }

  return (
    <DashboardShell>
      <PageHeader
        title={`${tournament.name} - Participants`}
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
      <ParticipantList participants={participants as any} tournamentId={id} />
    </DashboardShell>
  )
}
