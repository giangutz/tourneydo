import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { getTournamentStaff } from '@/lib/actions/staff'
import { notFound } from 'next/navigation'
import { StaffList } from '@/components/tournaments/dashboard/staff/staff-list'
import { InviteStaffDialog } from '@/components/tournaments/dashboard/staff/invite-staff-dialog'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/config/routes'

interface StaffPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function StaffPage({ params }: StaffPageProps) {
  const { id } = await params
  const tournament = await getTournamentById(id)
  
  if (!tournament) {
    notFound()
  }

  const staff = await getTournamentStaff(id)

  return (
    <DashboardShell>
      <PageHeader
        title="Tournament Staff"
        description={`Manage access for ${tournament.name}`}
        action={
           <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href={routes.organizer.tournamentDetail(tournament.id)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <InviteStaffDialog tournamentId={tournament.id} />
           </div>
        }
      />

      <div className="space-y-6">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="mb-4">
                <h3 className="text-lg font-medium">Current Staff</h3>
                <p className="text-sm text-muted-foreground">
                    Users with access to manage this tournament.
                </p>
            </div>
            <StaffList staff={staff} tournamentId={tournament.id} />
        </div>
      </div>
    </DashboardShell>
  )
}
