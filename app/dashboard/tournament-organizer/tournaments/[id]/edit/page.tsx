import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/config/routes'
import { EditTournamentClient } from './edit-tournament-client'

interface TournamentEditPageProps {
  params: Promise<{
    id: string
  }>
}



export default async function TournamentEditPage({ params }: TournamentEditPageProps) {
  const { id } = await params
  const tournament = await getTournamentById(id)
  
  // Fetch divisions to determine which are enabled
  const { getAllTournamentDivisions } = await import('@/lib/db/queries/divisions')
  // We handle potential error internally or defaulting to empty if fetch fails
  let enabledDivisions: string[] = []
  try {
     if (tournament) {
       const allDivs = await getAllTournamentDivisions(tournament.id)
       enabledDivisions = allDivs.filter(d => d.enabled).map(d => d.name)
     }
  } catch (e) {
  }

  if (!tournament) {
    notFound()
  }

  return (
    <DashboardShell>
      <div className="mb-4">
          <Button variant="outline" asChild className="w-fit">
            <Link href={routes.organizer.tournamentDetail(tournament.id)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
      </div>
      <PageHeader
        title="Settings"
        description="Update tournament details and settings."
      />
      <div className="max-w-2xl mx-auto">
        <EditTournamentClient 
          tournament={tournament} 
          enabledDivisions={enabledDivisions} 
          availableDivisions={enabledDivisions.map(name => ({ name }))} 
        />
      </div>
    </DashboardShell>
  )
}
