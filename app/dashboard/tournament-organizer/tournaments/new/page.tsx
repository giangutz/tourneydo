import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { TournamentForm } from '@/components/tournaments/tournament-form'

export default function NewTournamentPage() {
  return (
    <DashboardShell>
      <PageHeader
        title="Create Tournament"
        description="Set up a new tournament event."
      />
      <div className="max-w-2xl mx-auto">
        <TournamentForm />
      </div>
    </DashboardShell>
  )
}
