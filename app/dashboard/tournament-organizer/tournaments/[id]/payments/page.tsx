import { getTournamentPaymentGroupsPaginated } from '@/lib/db/queries/payments'
import { auth } from '@clerk/nextjs/server'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { redirect } from 'next/navigation'
import { getTournamentById } from '@/lib/db/queries/tournaments'
import { Button } from '@/components/ui/button'
import { ArrowLeft as ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { SearchInput } from '@/components/search-input'
import { CustomPagination } from '@/components/custom-pagination'
import { OrganizerPaymentsTable } from '@/components/payments/organizer-payments-table'

interface PaymentSubmissionsPageProps {
  params: Promise<{
    id: string
  }>
  searchParams?: Promise<{
    query?: string
    page?: string
  }>
}

export default async function PaymentSubmissionsPage(props: PaymentSubmissionsPageProps) {
  const { userId } = await auth()
  if (!userId) return null

  const params = await props.params
  const searchParams = await props.searchParams
  const id = params.id
  const query = searchParams?.query || ''
  const currentPage = Number(searchParams?.page) || 1

  const tournament = await getTournamentById(id)
  if (!tournament) redirect('/dashboard/tournament-organizer')
  if (tournament.organizer_id !== userId) redirect('/dashboard/tournament-organizer')

  const { data: payments, totalPages } = await getTournamentPaymentGroupsPaginated(id, currentPage, 10, query)

  return (
    <DashboardShell>
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href={`/dashboard/tournament-organizer/tournaments/${id}`}>
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <PageHeader
          title="Payment Submissions"
          description={`Manage payment verifications for ${tournament.name}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Received Payments</CardTitle>
          <CardDescription>
            Review and verify payment submissions from coaches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <SearchInput placeholder="Search by team or reference number..." />
          </div>

          <OrganizerPaymentsTable 
            payments={payments} 
            tournamentId={id} 
          />

          <div className="mt-4">
             <CustomPagination totalPages={totalPages} />
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
