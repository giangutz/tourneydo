"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, CreditCard } from "lucide-react"

interface Props {
  entryFee: number
  participants: {
    status: string
  }[]
}

export function RevenueStats({ entryFee, participants }: Props) {
  const active = participants.filter(p => ['pending', 'verified', 'paid'].includes(p.status))
  const totalProjected = active.length * entryFee
  
  // Count paid registrations
  const paidCount = participants.filter(p => p.status === 'paid').length
  const totalCollected = paidCount * entryFee

  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Projected Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatMoney(totalProjected)}</div>
          <p className="text-xs text-muted-foreground">
            From {active.length} registrations
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Collected Revenue</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatMoney(totalCollected)}</div>
          <p className="text-xs text-muted-foreground">
            {paidCount} paid registrations
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
