import { notFound } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentParticipants } from '@/lib/db/queries/registrations'
import { getTournamentDivisions } from '@/lib/db/queries/divisions'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { OfficialWeighInList } from '@/components/tournaments/weigh-in/official-weigh-in-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { routes } from '@/config/routes'
import { ArrowLeft } from 'lucide-react'
import { RealtimeListener } from '@/components/tournaments/realtime-listener'
import { createServerSupabaseClient } from '@/lib/supabase/server'

interface WeighInPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    page?: string
    query?: string
    status?: string
    divisionId?: string
    categoryId?: string
  }>
}

export default async function WeighInPage({ params, searchParams }: WeighInPageProps) {
  const { id } = await params
  const { page, query, status, divisionId, categoryId } = await searchParams
  
  const currentPage = Number(page) || 1
  const limit = 10 

  const tournament = await getTournamentById(id)

  if (!tournament) {
    notFound()
  }

  // Fetch data in parallel
  // Note: For official weigh-in, we might want to see ALL verified participants, not just those "selected" for random check.
  // Assuming getTournamentParticipants handles filtering logic correctly.
  // We passed weighInSelected: true in random, here we probably want all verified?
  // Or actually, anyone who is verified needs weigh in. 
  // Let's assume for now we list verified participants.
  
  // Actually, looking at the query, `weighInSelected` filters by `weigh_in_selected` column.
  // For official weigh in, we want everyone. So we remove that filter.
  // However, we probably only want 'verified' or 'paid' status participants.
  
  const [participantsRes, divisions] = await Promise.all([
    getTournamentParticipants(id, { 
      limit, 
      page: currentPage,
      query,
      weighInStatus: status, 
      divisionId: divisionId === 'all' ? undefined : divisionId,
      categoryId: categoryId === 'all' ? undefined : categoryId,
      // weighInSelected: true // REMOVED for official list
      status: 'verified' // Only concise way to get valid participants for weigh in
    }),
    getTournamentDivisions(id)
  ])

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
        title="Official Weigh-In"
        description="Process athlete weigh-ins. Search for an athlete and verify their weight and height."
      />

      {/* Tournament Configuration Summary */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <h3 className="font-semibold mb-3">Tournament Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Tournament Type</p>
            <p className="font-medium capitalize">{tournament.tournament_type === 'open-belt' ? 'Open Belt' : 'Standard'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Division Movement Policy</p>
            <p className="font-medium">
              {tournament.division_move_policy === 'allow_move' 
                ? '✓ Allow Division Moves' 
                : '✗ Disqualify Only'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Active Divisions</p>
            <p className="font-medium">{divisions.length} divisions configured</p>
          </div>
        </div>
      </div>

      <OfficialWeighInList 
        participants={participantsRes.data}
        divisions={divisions}
        tournamentId={tournament.id}
        page={currentPage}
        totalPages={participantsRes.totalPages}
        totalCount={participantsRes.count}
      />
      <RealtimeListener tournamentId={tournament.id} />
    </DashboardShell>
  )
}
