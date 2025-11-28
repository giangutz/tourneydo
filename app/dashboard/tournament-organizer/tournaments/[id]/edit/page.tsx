import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { TournamentForm } from '@/components/tournaments/tournament-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/config/routes'

interface TournamentEditPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function TournamentEditPage({ params }: TournamentEditPageProps) {
  const { id } = await params
  const tournament = await getTournamentById(id)

  if (!tournament) {
    notFound()
  }

  return (
    <DashboardShell>
      <PageHeader
        title={`Edit ${tournament.name}`}
        description="Update tournament details and settings."
        action={
          <Button variant="outline" asChild>
            <Link href={routes.organizer.tournamentDetail(tournament.id)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        }
      />
      <div className="max-w-2xl mx-auto">
        <TournamentForm tournament={tournament} />
      </div>
    </DashboardShell>
  )
}
