'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, Check, X, Building2, User } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { approvePayment, rejectPayment, bulkApprovePayments, bulkRejectPayments } from '@/lib/actions/payments'

interface PendingPayment {
  id: string
  amount: number
  reference_number: string
  created_at: string
  status: 'pending'
  tournaments: {
    id: string
    name: string
  }
  teams: {
    id: string
    name: string
  }
}

interface PaymentReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payments: PendingPayment[]
}

export function PaymentReviewDialog({ open, onOpenChange, payments }: PaymentReviewDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] })
  const [rejectionReason, setRejectionReason] = useState('')

  // Group payments by tournament
  const groupedPayments = payments.reduce((acc, payment) => {
    const tId = payment.tournaments.id
    if (!acc[tId]) {
      acc[tId] = {
        name: payment.tournaments.name,
        items: []
      }
    }
    acc[tId].items.push(payment)
    return acc
  }, {} as Record<string, { name: string; items: PendingPayment[] }>)

  const toggleSelectAll = () => {
    if (selectedIds.length === payments.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(payments.map(p => p.id))
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleApprove = async (ids: string[]) => {
    setIsProcessing(true)
    try {
      let result
      if (ids.length === 1) {
        result = await approvePayment(ids[0])
      } else {
        result = await bulkApprovePayments(ids)
      }

      if (result.success) {
        toast.success(`Successfully approved ${ids.length} payment(s)`)
        setSelectedIds([])
        if (ids.length === payments.length) {
          onOpenChange(false)
        }
      } else {
        toast.error(result.error || 'Failed to approve payments')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectClick = (ids: string[]) => {
    setRejectDialog({ open: true, ids })
    setRejectionReason('')
  }

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required')
      return
    }

    setIsProcessing(true)
    try {
      const ids = rejectDialog.ids
      let result
      if (ids.length === 1) {
        result = await rejectPayment(ids[0], rejectionReason)
      } else {
        result = await bulkRejectPayments(ids, rejectionReason)
      }

      if (result.success) {
        toast.success(`Successfully rejected ${ids.length} payment(s)`)
        setSelectedIds([])
        setRejectDialog({ open: false, ids: [] })
        if (ids.length === payments.length) {
          onOpenChange(false)
        }
      } else {
        toast.error(result.error || 'Failed to reject payments')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Payment Submissions</DialogTitle>
            <DialogDescription>
              Review pending payments from coaches. You can approve or reject them individually or in bulk.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={selectedIds.length === payments.length && payments.length > 0} 
                onCheckedChange={toggleSelectAll}
                id="select-all"
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All ({payments.length})
              </label>
            </div>
            
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                  onClick={() => handleRejectClick(selectedIds)}
                  disabled={isProcessing}
                >
                  <X className="mr-1 h-3 w-3" />
                  Reject ({selectedIds.length})
                </Button>
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleApprove(selectedIds)}
                  disabled={isProcessing}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Approve ({selectedIds.length})
                </Button>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 min-h-[300px] pr-4">
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Check className="h-12 w-12 mb-4 text-green-500" />
                <p>All caught up! No pending payments.</p>
              </div>
            ) : (
              <div className="space-y-6 py-4">
                {Object.entries(groupedPayments).map(([tId, group]) => (
                  <div key={tId} className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2 text-sm text-foreground/80 sticky top-0 bg-background py-2">
                      <Building2 className="h-4 w-4" />
                      {group.name}
                    </h3>
                    <div className="grid gap-3">
                      {group.items.map(payment => (
                        <div 
                          key={payment.id} 
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${selectedIds.includes(payment.id) ? 'bg-muted/50 border-primary/50' : 'hover:bg-muted/30'}`}
                        >
                          <Checkbox 
                            checked={selectedIds.includes(payment.id)} 
                            onCheckedChange={() => toggleSelection(payment.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 grid gap-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm flex items-center gap-2">
                                <User className="h-3 w-3 text-muted-foreground" />
                                {payment.teams.name}
                              </span>
                              <Badge variant="outline" className="font-mono">
                                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(payment.amount)}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground break-all">
                              Ref: <span className="font-mono text-foreground">{payment.reference_number}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Submitted {formatDistanceToNow(new Date(payment.created_at))} ago
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                             <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleApprove([payment.id])}
                                disabled={isProcessing}
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleRejectClick([payment.id])}
                                disabled={isProcessing}
                                title="Reject"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, ids: [] })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {rejectDialog.ids.length > 1 ? 'these payments' : 'this payment'}. 
              This will be visible to the coach.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Invalid reference number, Amount mismatch..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 p-2 bg-amber-50 text-amber-800 rounded text-xs">
              <AlertCircle className="h-4 w-4" />
              This action cannot be undone. Registrations will remain pending.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, ids: [] })} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmReject} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
