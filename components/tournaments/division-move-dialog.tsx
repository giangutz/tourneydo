'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Info } from 'lucide-react'
import { moveParticipantDivision } from '@/lib/actions/participants'
import { toast } from 'sonner'

interface Participant {
  id: string
  tournament_id: string
  player: {
    first_name: string
    last_name: string
  }
}

interface SuggestedDivision {
  divisionName: string
  divisionId: string
  categoryName: string
  categoryId: string
  categoryGender: string
  reason: string
  minWeight?: number | null
  maxWeight?: number | null
  minHeight?: number | null
  maxHeight?: number | null
}

interface DivisionMoveDialogProps {
  participant: Participant
  suggestedDivisions: SuggestedDivision[]
  actualWeight: number | null
  actualHeight: number | null
  tournamentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DivisionMoveDialog({
  participant,
  suggestedDivisions,
  actualWeight,
  actualHeight,
  tournamentId,
  open,
  onOpenChange,
  onSuccess
}: DivisionMoveDialogProps) {
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!selectedKey) {
      toast.error('Please select a division')
      return
    }

    const [divisionId, categoryId] = selectedKey.split('|')
    
    setIsSubmitting(true)
    try {
      const result = await moveParticipantDivision(
        participant.id,
        tournamentId,
        divisionId,
        categoryId
      )

      if (result?.success) {
        toast.success('Participant moved successfully')
        onOpenChange(false)
        if (onSuccess) onSuccess()
      } else {
        toast.error(result?.error || 'Failed to move participant')
      }
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Move to Different Division</DialogTitle>
          <DialogDescription>
            Select an alternative division for {participant.player.first_name} {participant.player.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Actual measurements: {actualWeight ? `${actualWeight}kg` : ''} {actualHeight ? `${actualHeight}cm` : ''}
            </AlertDescription>
          </Alert>

          {suggestedDivisions.length === 0 ? (
            <Alert variant="destructive">
              <AlertDescription>
                No suitable divisions found for these measurements. Consider disqualifying the participant.
              </AlertDescription>
            </Alert>
          ) : (
            <RadioGroup value={selectedKey} onValueChange={setSelectedKey}>
              <div className="space-y-3">
                {suggestedDivisions.map((div, index) => {
                  const key = `${div.divisionId}|${div.categoryId}`
                  const limits = div.minWeight !== undefined
                    ? `${div.minWeight || 0}-${div.maxWeight || '∞'}kg`
                    : `${div.minHeight || 0}-${div.maxHeight || '∞'}cm`

                  return (
                    <div key={index} className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent">
                      <RadioGroupItem value={key} id={key} className="mt-1" />
                      <Label htmlFor={key} className="flex-1 cursor-pointer">
                        <div className="font-medium">
                          {div.divisionName} - {div.categoryName} ({div.categoryGender})
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {div.reason}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Limits: {limits}
                        </div>
                      </Label>
                    </div>
                  )
                })}
              </div>
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedKey}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
