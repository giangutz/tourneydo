'use client'

import { getAdminPayments, verifyPayment } from '@/app/actions/admin-payments'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, X, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  async function loadPayments() {
    const { data } = await getAdminPayments()
    if (data) setPayments(data)
    setLoading(false)
  }

  useEffect(() => {
    loadPayments()
  }, [])

  const handleVerify = async (id: string, status: 'verified' | 'rejected') => {
    setProcessing(id)
    const res = await verifyPayment(id, status)
    if (res.error) {
      alert(res.error)
    } else {
      loadPayments()
    }
    setProcessing(null)
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Payment Verification</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Pending Payments</CardTitle>
          <CardDescription>Review and verify coach payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tournament</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No payments found.
                  </TableCell>
                </TableRow>
              )}
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.tournaments.title}</TableCell>
                  <TableCell>{payment.teamName}</TableCell>
                  <TableCell>${payment.amount}</TableCell>
                  <TableCell>
                    {payment.proof_image_url ? (
                      <a href={payment.proof_image_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline text-sm">
                        View Proof <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">No proof</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      payment.status === 'verified' ? 'default' : 
                      payment.status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleVerify(payment.id, 'verified')}
                          disabled={!!processing}
                        >
                          {processing === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleVerify(payment.id, 'rejected')}
                          disabled={!!processing}
                        >
                          {processing === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
