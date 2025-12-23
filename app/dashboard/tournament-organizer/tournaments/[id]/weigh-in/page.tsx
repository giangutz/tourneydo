import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { getTournamentDivisions } from '@/lib/db/queries/divisions'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { WeighInList } from '@/components/tournaments/weigh-in/weigh-in-list'
import { WeighInGenerator } from '@/components/tournaments/weigh-in/weigh-in-generator'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { routes } from '@/config/routes'
import { ArrowLeft } from 'lucide-react'
import { RealtimeListener } from '@/components/tournaments/realtime-listener'

interface WeighInPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function WeighInPage({ params }: WeighInPageProps) {
  const { id } = await params
  const tournament = await getTournamentById(id)

  if (!tournament) {
    notFound()
  }

  // Fetch data in parallel
  const [participantsRes, divisions] = await Promise.all([
    getTournamentParticipants(id, { limit: 2000 }),
    getTournamentDivisions(id)
  ])

  // Check if brackets are generated (matches exist)
  const supabase = createServerSupabaseClient()
  const { count: matchCount } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', id)
  
  const hasBrackets = (matchCount || 0) > 0

  return (
    <DashboardShell>
      <PageHeader
        title="Random Weigh-In Check"
        description="Manage competition day surprise weigh-ins. Select participants and verify their weight."
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={routes.organizer.tournamentDetail(tournament.id)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <WeighInGenerator tournamentId={tournament.id} disabled={!hasBrackets} />
          </div>
        }
      />

      <WeighInList 
        participants={participantsRes.data}
        divisions={divisions}
        tournamentId={tournament.id}
      />
      <RealtimeListener tournamentId={tournament.id} />
    </DashboardShell>
  )
}
