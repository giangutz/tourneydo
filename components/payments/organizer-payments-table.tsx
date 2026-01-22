"use client"

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { formatShortDate } from '@/lib/utils'
import { Check, X, Loader2, AlertCircle, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { approvePayment, rejectPayment, bulkApprovePayments, bulkRejectPayments } from '@/lib/actions/payments'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PaymentGroup } from '@/lib/db/queries/payments'

interface OrganizerPaymentsTableProps {
  payments: PaymentGroup[]
  tournamentId: string
}

export function OrganizerPaymentsTable({ payments, tournamentId }: OrganizerPaymentsTableProps) {
  const [selectedRefs, setSelectedRefs] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; refs: string[] }>({ open: false, refs: [] })
  const [rejectionReason, setRejectionReason] = useState('')

  const toggleSelectAll = () => {
    if (selectedRefs.length === payments.length) {
      setSelectedRefs([])
    } else {
      setSelectedRefs(payments.map((p) => p.reference_number))
    }
  }

  const toggleSelection = (ref: string) => {
    setSelectedRefs((prev) =>
      prev.includes(ref) ? prev.filter((r) => r !== ref) : [...prev, ref]
    )
  }

  const getIdsFromRefs = (refs: string[]) => {
    return payments
      .filter(p => refs.includes(p.reference_number))
      .flatMap(p => p.payments.map(payment => payment.id))
  }

  const handleApprove = async (refs: string[]) => {
    const ids = getIdsFromRefs(refs)
    if (ids.length === 0) return

    setIsProcessing(true)
    try {
      let result
      if (ids.length === 1) {
        result = await approvePayment(ids[0])
      } else {
        result = await bulkApprovePayments(ids)
      }

      if (result.success) {
        toast.success(`Successfully approved ${refs.length} transaction(s)`)
        setSelectedRefs([])
      } else {
        toast.error(result.error || 'Failed to approve payments')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectClick = (refs: string[]) => {
    setRejectDialog({ open: true, refs })
    setRejectionReason('')
  }

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required')
      return
    }

    const ids = getIdsFromRefs(rejectDialog.refs)
    if (ids.length === 0) return

    setIsProcessing(true)
    try {
      let result
      if (ids.length === 1) {
        result = await rejectPayment(ids[0], rejectionReason)
      } else {
        result = await bulkRejectPayments(ids, rejectionReason)
      }

      if (result.success) {
        toast.success(`Successfully rejected ${rejectDialog.refs.length} transaction(s)`)
        setSelectedRefs([])
        setRejectDialog({ open: false, refs: [] })
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
      <div className="flex items-center justify-between py-4 min-h-[56px]">
        {selectedRefs.length > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 transition-all">
            <span className="text-sm font-medium text-muted-foreground mr-2">
              {selectedRefs.length} selected
            </span>
            <BugfixIconButton
              size="sm"
              variant="outline"
              className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
              onClick={() => handleRejectClick(selectedRefs)}
              disabled={isProcessing}
            >
              <X className="mr-1 h-3 w-3" />
              Reject Selection
            </BugfixIconButton>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleApprove(selectedRefs)}
              disabled={isProcessing}
            >
              <Check className="mr-1 h-3 w-3" />
              Approve Selection
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={selectedRefs.length === payments.length && payments.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Teams</TableHead>
              <TableHead>Covered Athletes</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((group) => (
              <TableRow key={group.reference_number} className={selectedRefs.includes(group.reference_number) ? 'bg-muted/50' : ''}>
                <TableCell>
                  <Checkbox
                    checked={selectedRefs.includes(group.reference_number)}
                    onCheckedChange={() => toggleSelection(group.reference_number)}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatShortDate(group.created_at)}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-mono text-xs font-semibold">{group.reference_number}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {group.payment_count} {group.payment_count === 1 ? 'record' : 'records'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[150px]">
                    {group.team_names.map((name, i) => (
                      <span key={i} className="text-xs font-medium">
                        {name}{i < group.team_names.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[250px]">
                    {group.athletes.map((athlete, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] font-normal py-0 px-2 h-5">
                        {athlete.first_name} {athlete.last_name}
                      </Badge>
                    ))}
                    {group.athletes.length === 0 && (
                      <span className="text-muted-foreground text-xs italic">None specified</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-semibold">₱{group.total_amount.toLocaleString()}</TableCell>
                <TableCell>
                  {group.status === 'mixed' ? (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 w-fit">
                      <Layers className="h-3 w-3" />
                      Mixed
                    </Badge>
                  ) : (
                    <Badge
                      variant={
                        group.status === 'verified'
                          ? 'default'
                          : group.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {(group.status === 'pending' || group.status === 'mixed') && (
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleApprove([group.reference_number])}
                        disabled={isProcessing}
                        title="Approve Transaction"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRejectClick([group.reference_number])}
                        disabled={isProcessing}
                        title="Reject Transaction"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No payment submissions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={rejectDialog.open} onOpenChange={(open) => !open && setRejectDialog({ open: false, refs: [] })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {rejectDialog.refs.length > 1 ? 'these transactions' : 'this transaction'}.
              This will be visible to the coach(es).
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
              This action cannot be undone. All linked registrations will remain pending.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, refs: [] })} disabled={isProcessing}>
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

// Simple wrapper or renaming to match the button usage if needed, 
// using Button directly as BugfixIconButton was a thought but lucide icons are used inside Button.
const BugfixIconButton = Button;
