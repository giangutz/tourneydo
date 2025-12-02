'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle } from 'lucide-react'
import { disqualifyParticipant } from '@/lib/actions/participants'
import { toast } from 'sonner'

interface Participant {
  id: string
  tournament_id: string
  player: {
    first_name: string
    last_name: string
  }
}

interface DisqualificationDialogProps {
  participant: Participant
  reason: string
  tournamentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DisqualificationDialog({
  participant,
  reason: defaultReason,
  tournamentId,
  open,
  onOpenChange
}: DisqualificationDialogProps) {
  const [reason, setReason] = useState(defaultReason)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for disqualification')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await disqualifyParticipant(participant.id, tournamentId, reason)

      if (!result.success) {
        toast.error(result.error || 'Failed to disqualify participant')
        return
      }

      toast.success('Participant disqualified')
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to disqualify participant')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Disqualify Participant
          </DialogTitle>
          <DialogDescription>
            This will remove {participant.player.first_name} {participant.player.last_name} from the tournament
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action cannot be easily undone. The participant will be excluded from bracket generation.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Disqualification *</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for disqualification..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSubmitting || !reason.trim()}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Disqualification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
