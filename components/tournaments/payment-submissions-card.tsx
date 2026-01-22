import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import { CreditCard } from "lucide-react"
import Link from 'next/link'

interface PaymentSubmissionsCardProps {
  pendingPayments: any[]
  tournamentId: string
}

export function PaymentSubmissionsCard({ pendingPayments, tournamentId }: PaymentSubmissionsCardProps) {
  return (
    <Link href={`/dashboard/tournament-organizer/tournaments/${tournamentId}/payments`} className="block">
      <Card className="hover:bg-muted/50 transition-colors h-full">
        <CardHeader>
          <CardTitle className="flex items-center text-base justify-between">
            <div className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5 text-primary" />
              Payment Submissions
            </div>
            {pendingPayments.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingPayments.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Review & Verify</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  )
}
