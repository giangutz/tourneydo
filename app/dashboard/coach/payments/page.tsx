import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getCoachPayments } from '@/lib/db/queries/payments'
import { DashboardShell } from '@/components/layouts/dashboard-shell'
import { PageHeader } from '@/components/ui/page-header'
import { PaymentHistoryList } from '@/components/payments/payment-history-list'

export default async function PaymentHistoryPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const payments = await getCoachPayments(userId)

  return (
    <DashboardShell>
      <PageHeader
        title="Payment History"
        description="View all your payment submissions and their statuses"
      />
      <PaymentHistoryList payments={payments} />
    </DashboardShell>
  )
}
