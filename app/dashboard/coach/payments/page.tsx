'use client'

import { getCoachPayments, uploadPaymentProof } from '@/app/actions/payments'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  async function loadPayments() {
    const { data } = await getCoachPayments()
    if (data) setPayments(data)
    setLoading(false)
  }

  useEffect(() => {
    loadPayments()
  }, [])

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedPaymentId) return

    setUploading(true)
    const formData = new FormData(e.currentTarget)
    
    const res = await uploadPaymentProof(selectedPaymentId, formData)
    
    if (res.error) {
      alert(res.error)
    } else {
      setDialogOpen(false)
      loadPayments()
    }
    setUploading(false)
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Upload proof of payment for your tournament fees.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tournament</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No payments found.
                  </TableCell>
                </TableRow>
              )}
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.tournaments.title}</TableCell>
                  <TableCell>${payment.amount}</TableCell>
                  <TableCell>
                    <Badge variant={
                      payment.status === 'verified' ? 'default' : 
                      payment.status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {payment.proof_image_url ? (
                      <a href={payment.proof_image_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                        View Proof
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not uploaded</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status !== 'verified' && (
                      <Dialog open={dialogOpen && selectedPaymentId === payment.id} onOpenChange={(open) => {
                        setDialogOpen(open)
                        if (open) setSelectedPaymentId(payment.id)
                        else setSelectedPaymentId(null)
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Proof
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upload Payment Proof</DialogTitle>
                            <DialogDescription>
                              Please upload a screenshot of your bank transfer or payment receipt.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleUpload} className="space-y-4">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                              <Label htmlFor="proof">Image File</Label>
                              <Input id="proof" name="file" type="file" accept="image/*" required />
                            </div>
                            <DialogFooter>
                              <Button type="submit" disabled={uploading}>
                                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Upload
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
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
