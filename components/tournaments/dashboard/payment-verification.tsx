"use client"

import { useState } from "react"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, X, Loader2 } from "lucide-react"
import { verifyPaymentAction } from "@/lib/actions/payments"
import { toast } from "sonner"
import { format } from "date-fns"

interface Payment {
  id: string
  amount: number
  reference_number: string
  status: string
  created_at: string
  team_id: string
  tournament_id: string
  teams?: { name: string } | null // Handle relation array or object depending on query
  // Since our query fetches arrays for relations usually unless .single(), 
  // but let's assume mapped or single object.
  // The query was `teams (id, name)`. Supabase returns object or array?
  // Usually object for foreign key if not one-to-many. `payments` -> check FK.
  // `team_id references teams`. It's N:1 (Payment belongs to Team). So `teams` is object.
}

interface Props {
  payments: any[] // Using any to avoid strict type checks on relation for now, but safer to type properly
  tournamentId: string
}

export function PaymentVerification({ payments, tournamentId }: Props) {
  const [processingId, setProcessingId] = useState<string | null>(null)
  // const { toast } = useToast() // Removed

  async function handleAction(payment: Payment, status: 'verified' | 'rejected') {
    setProcessingId(payment.id)
    
    // revalidate the dashboard page
    const path = `/dashboard/tournament-organizer/tournaments/${tournamentId}`

    const result = await verifyPaymentAction(
       payment.id, 
       status, 
       { teamId: payment.team_id, tournamentId: payment.tournament_id },
       path
    )

    if (result.success) {
      if (status === 'verified') {
        toast.success("Payment Verified", {
          description: "Team registrations have been updated.",
        })
      } else {
        toast.info("Payment Rejected", {
          description: "Payment marked as rejected.",
        })
      }
    } else {
       toast.error("Action Failed", {
        description: result.error,
      })
    }
    
    setProcessingId(null)
  }

  const pending = payments.filter(p => p.status === 'pending')

  if (pending.length === 0) {
    return <div className="text-sm text-muted-foreground p-4">No pending payments to verify.</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Team</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pending.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell className="font-medium">
               {/* Handle if teams is array or object. Supabase TS types: object usually */}
               {Array.isArray(payment.teams) ? payment.teams[0]?.name : payment.teams?.name}
            </TableCell>
            <TableCell>{payment.reference_number}</TableCell>
            <TableCell>
              {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(payment.amount)}
            </TableCell>
            <TableCell>{format(new Date(payment.created_at), 'MMM d, h:mm a')}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => handleAction(payment, 'verified')}
                  disabled={processingId === payment.id}
                >
                  {processingId === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleAction(payment, 'rejected')}
                   disabled={processingId === payment.id}
                >
                   {processingId === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
