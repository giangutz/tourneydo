import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { TournamentCreateWizard } from '@/components/tournaments/tournament-create-wizard'

export default function NewTournamentPage() {
  return (
    <DashboardShell>
      <PageHeader
        title="Create Tournament"
        description="Set up a new tournament event."
      />
      <div className="max-w-2xl mx-auto">
        <TournamentCreateWizard />
      </div>
    </DashboardShell>
  )
}
