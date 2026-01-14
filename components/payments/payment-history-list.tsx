'use client'

import { useState } from 'react'
import { Payment } from '@/types/models'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDistanceToNow } from 'date-fns'
import { CreditCard, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

interface PaymentWithDetails extends Payment {
  tournaments?: { name: string }
  teams?: { name: string }
}

interface PaymentHistoryListProps {
  payments: PaymentWithDetails[]
}

export function PaymentHistoryList({ payments }: PaymentHistoryListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredPayments = payments.filter(payment => {
    if (statusFilter === 'all') return true
    return payment.status === statusFilter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        )
      case 'pending':
      default:
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        )
    }
  }

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No payment submissions"
        description="You haven't submitted any payments yet."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payment History</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No payments found with the selected filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPayments.map((payment) => (
            <Card key={payment.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {payment.tournaments?.name || 'Tournament'}
                    </CardTitle>
                    <CardDescription>
                      {payment.teams?.name || 'Team'}
                    </CardDescription>
                  </div>
                  {getStatusBadge(payment.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Amount:</span>
                    <div className="font-medium">
                      ₱{payment.amount.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Reference:</span>
                    <div className="font-mono text-xs break-all">
                      {payment.reference_number}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Submitted {formatDistanceToNow(new Date(payment.created_at))} ago
                </div>

                {payment.status === 'rejected' && payment.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-red-900">Rejection Reason</div>
                        <div className="text-sm text-red-700 mt-1">
                          {payment.rejection_reason}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
