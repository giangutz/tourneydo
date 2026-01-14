'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import { CreditCard } from "lucide-react"
import { PaymentReviewDialog } from '@/components/payments/payment-review-dialog'

interface PaymentSubmissionsCardProps {
  pendingPayments: any[]
}

export function PaymentSubmissionsCard({ pendingPayments }: PaymentSubmissionsCardProps) {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  
  return (
    <>
      <div onClick={() => setShowPaymentDialog(true)} className="block cursor-pointer">
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
      </div>

      <PaymentReviewDialog 
        open={showPaymentDialog} 
        onOpenChange={setShowPaymentDialog}
        payments={pendingPayments}
      />
    </>
  )
}
