'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, ArrowRight } from "lucide-react"
import { PaymentReviewDialog } from '@/components/payments/payment-review-dialog'

interface QuickActionsProps {
  pendingPayments: any[]
}

export function QuickActions({ pendingPayments }: QuickActionsProps) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Quick Actions</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors border-l-4 border-l-blue-500"
          onClick={() => setShowPaymentDialog(true)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex justify-between items-center">
              Payment Submissions
              {pendingPayments.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingPayments.length} New
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Review pending payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-2xl font-bold">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <span>{pendingPayments.length}</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground flex items-center">
              Review & Approve <ArrowRight className="ml-1 h-3 w-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      <PaymentReviewDialog 
        open={showPaymentDialog} 
        onOpenChange={setShowPaymentDialog}
        payments={pendingPayments}
      />
    </div>
  )
}
