import { getCoachPaymentGroupsPaginated } from '@/lib/db/queries/payments'
import { auth } from '@clerk/nextjs/server'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatShortDate } from '@/lib/utils'
import { SearchInput } from '@/components/search-input'
import { CustomPagination } from '@/components/custom-pagination'
import { AlertCircle, CheckCircle2, Clock, XCircle, Layers } from 'lucide-react'

interface CoachPaymentsPageProps {
  searchParams?: Promise<{
    query?: string
    page?: string
  }>
}

export default async function CoachPaymentsPage(props: CoachPaymentsPageProps) {
  const { userId } = await auth()
  if (!userId) return null

  const searchParams = await props.searchParams
  const query = searchParams?.query || ''
  const currentPage = Number(searchParams?.page) || 1

  const { data: requestGroups, totalPages } = await getCoachPaymentGroupsPaginated(userId, currentPage, 10, query)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1 w-fit">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        )
      case 'mixed':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 w-fit">
            <Layers className="h-3 w-3" />
            Mixed Status
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1 w-fit">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
    }
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Payment History"
        description="Track all your payment submissions. Payments with the same reference number are grouped together."
      />

      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
          <CardDescription>
            View your payment history grouped by reference number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <SearchInput placeholder="Search by reference, tournament, or team..." className="md:w-full" />
          </div>

            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference Number</TableHead>
                    <TableHead>Tournaments</TableHead>
                    <TableHead>Teams Covered</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestGroups.map((group) => (
                    <TableRow key={group.reference_number}>
                      <TableCell>
                        {formatShortDate(group.created_at)}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-medium">{group.reference_number}</span>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {group.payment_count} {group.payment_count === 1 ? 'record' : 'records'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {group.tournament_names.map((name, i) => (
                             <span key={i} className="text-sm">{name}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {group.team_names.map((name, i) => (
                            <Badge key={i} variant="secondary" className="text-xs font-normal">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ₱{group.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(group.status)}
                      </TableCell>
                      <TableCell className="max-w-[150px] text-xs text-muted-foreground">
                        {group.rejection_reason ? (
                          <span className="text-destructive">{group.rejection_reason}</span>
                        ) : (
                          group.status === 'mixed' ? 'Some items pending/verified' : '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {requestGroups.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        {query ? 'No payments match your search.' : 'No payment history found.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile/Tablet Card View */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:hidden">
              {requestGroups.map((group) => (
                <Card key={group.reference_number} className="overflow-hidden border shadow-sm">
                  <CardHeader className="pb-2 bg-muted/40">
                    <div className="flex justify-between items-start">
                       <div>
                          <CardTitle className="text-base font-mono">#{group.reference_number}</CardTitle>
                          <CardDescription>
                            {formatShortDate(group.created_at)}
                          </CardDescription>
                       </div>
                       {getStatusBadge(group.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 text-sm space-y-4">
                     <div>
                        <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold block mb-1">Total Amount</span>
                        <span className="font-medium text-lg">₱{group.total_amount.toLocaleString()}</span>
                     </div>
                     
                     <div>
                        <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold block mb-2">Tournaments</span>
                        <div className="flex flex-col gap-1">
                          {group.tournament_names.map((name, i) => (
                             <span key={i} className="text-sm bg-secondary/50 px-2 py-1 rounded-md">{name}</span>
                          ))}
                        </div>
                     </div>

                     <div>
                        <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold block mb-2">Teams</span>
                        <div className="flex flex-wrap gap-1">
                          {group.team_names.map((name, i) => (
                            <Badge key={i} variant="outline" className="text-xs font-normal">
                              {name}
                            </Badge>
                          ))}
                        </div>
                     </div>
                     
                     {group.rejection_reason && (
                        <div className="bg-red-50 text-red-700 p-2 rounded-md text-xs border border-red-200">
                           <span className="font-semibold">Note:</span> {group.rejection_reason}
                        </div>
                     )}
                  </CardContent>
                </Card>
              ))}
              {requestGroups.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                  {query ? 'No payments match your search.' : 'No payment history found.'}
                </div>
              )}
            </div>

          <div className="mt-4">
             <CustomPagination totalPages={totalPages} />
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
