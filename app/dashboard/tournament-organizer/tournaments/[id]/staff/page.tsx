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
  searchParams: Promise<{
    page?: string
    search?: string
    role?: string
  }>
}

export default async function StaffPage({ params, searchParams }: StaffPageProps) {
  const { id } = await params
  const { page, search, role } = await searchParams
  
  const currentPage = Number(page) || 1
  const query = search || ''
  const roleFilter = role || 'all'

  const tournament = await getTournamentById(id)
  
  if (!tournament) {
    notFound()
  }

  const { data: staff, totalPages } = await getTournamentStaff(id, currentPage, 10, query, roleFilter)

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
        title="Tournament Staff"
        description={`Manage access for ${tournament.name}`}
        action={
            <InviteStaffDialog tournamentId={tournament.id} triggerClassName="w-full sm:w-auto" />
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
            <StaffList 
                staff={staff} 
                tournamentId={tournament.id} 
                totalPages={totalPages}
                currentPage={currentPage}
            />
        </div>
      </div>
    </DashboardShell>
  )
}
