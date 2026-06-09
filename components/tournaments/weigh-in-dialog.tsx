'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertTriangle, Scale, Info } from 'lucide-react'
import { weighInParticipant } from '@/lib/actions/participants-weigh-in'
import { toast } from 'sonner'
import { DivisionMoveDialog } from '@/components/tournaments/division-move-dialog'
import { DisqualificationDialog } from '@/components/tournaments/disqualification-dialog'

interface Participant {
  id: string
  tournament_id: string
  status: 'pending' | 'verified' | 'paid'
  player: {
    id: string
    first_name: string
    last_name: string
    weight: number | null
    height: number | null
    dob: string
    gender: 'male' | 'female'
    belt_level: string | null
  }
  team: {
    name: string
  }
  actual_weight: number | null
  actual_height: number | null
  division_id?: string | null
  category_id?: string | null
  tournament_divisions?: any
  tournament_categories?: any
}

interface WeighInDialogProps {
  participant: Participant
  tournamentId: string
  tournamentType?: 'standard' | 'open-belt'
  divisionName?: string
  categoryName?: string
  categoryLimits?: {
    minWeight?: number | null
    maxWeight?: number | null
    minHeight?: number | null
    maxHeight?: number | null
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

const getSingle = (val: any) => Array.isArray(val) ? val[0] : val

export function WeighInDialog({
  participant,
  tournamentId,
  tournamentType = 'standard',
  divisionName,
  categoryName,
  categoryLimits,
  open,
  onOpenChange
}: WeighInDialogProps) {
  // Extract data robustly if not provided
  const category = getSingle(participant.tournament_categories)
  const division = getSingle(participant.tournament_divisions)
  
  const effectiveDivisionName = divisionName || division?.name
  const effectiveCategoryName = categoryName || category?.name
  const effectiveLimits = categoryLimits || {
    minWeight: category?.min_weight,
    maxWeight: category?.max_weight,
    minHeight: category?.min_height,
    maxHeight: category?.max_height,
  }

  const [actualWeight, setActualWeight] = useState<string>(participant.actual_weight?.toString() || '')
  const [actualHeight, setActualHeight] = useState<string>(participant.actual_height?.toString() || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [showDivisionMove, setShowDivisionMove] = useState(false)
  const [showDisqualify, setShowDisqualify] = useState(false)
  const [showValidationAlert, setShowValidationAlert] = useState(false)

  const age = participant.player.dob
    ? new Date().getFullYear() - new Date(participant.player.dob).getFullYear()
    : null

  const isHeightBased = age !== null && age < 12

  const handleRecordWeighIn = async () => {
    if (!actualWeight && !actualHeight) {
      toast.error('Please enter actual weight or height')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await weighInParticipant(
        participant.id,
        tournamentId,
        actualWeight ? parseFloat(actualWeight) : null,
        actualHeight ? parseFloat(actualHeight) : null
      )

      if (!result.success) {
        toast.error(result.error || 'Failed to record weigh-in')
        return
      }

      if (result.data?.needsAction) {
        // Out of range - trigger validation dialog
        setValidationResult(result.data)
        setShowValidationAlert(true)
      } else {
        // Within limits - success
        toast.success('Weigh-in recorded successfully')
        onOpenChange(false)
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to record weigh-in')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format limits for display
  const limitsDisplay = effectiveLimits
    ? isHeightBased
      ? `${effectiveLimits.minHeight || 0} - ${effectiveLimits.maxHeight || '∞'} cm`
      : `${effectiveLimits.minWeight || 0} - ${effectiveLimits.maxWeight || '∞'} kg`
    : 'Not assigned'

  return (
    <>
      <Dialog open={open && !showDivisionMove && !showDisqualify && !showValidationAlert} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Weigh-In: {participant.player.first_name} {participant.player.last_name}
            </DialogTitle>
            <DialogDescription>
              Record actual measurements during weigh-in
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Division Info */}
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Current Division Assignment</p>
                <Badge variant="outline">{tournamentType === 'open-belt' ? 'Open Belt' : 'Standard'}</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Division</p>
                  <p className="font-medium">{effectiveDivisionName || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">{effectiveCategoryName || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">{participant.player.gender}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Age</p>
                  <p className="font-medium">{age || '–'} years</p>
                </div>
                {tournamentType === 'standard' && (
                  <div>
                    <p className="text-muted-foreground">Belt Level</p>
                    <p className="font-medium">{participant.player.belt_level || '–'}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Category Limits</p>
                  <p className="font-medium">{limitsDisplay}</p>
                </div>
              </div>
            </div>

            {/* Registered vs Actual Measurements */}
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-semibold">Measurements</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Registered Weight</p>
                  <p className="font-medium">{participant.player.weight ? `${participant.player.weight} kg` : '–'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Registered Height</p>
                  <p className="font-medium">{participant.player.height ? `${participant.player.height} cm` : '–'}</p>
                </div>
              </div>
            </div>

            {/* Actual measurements input */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Actual Measurements</Label>
              <div className="grid gap-4">
                {!isHeightBased && (
                  <div className="space-y-2">
                    <Label htmlFor="actual-weight">Actual Weight (kg) *</Label>
                    <Input
                      id="actual-weight"
                      type="number"
                      step="0.1"
                      placeholder="Enter actual weight"
                      value={actualWeight}
                      onChange={(e) => setActualWeight(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                )}

                {isHeightBased && (
                  <div className="space-y-2">
                    <Label htmlFor="actual-height">Actual Height (cm) *</Label>
                    <Input
                      id="actual-height"
                      type="number"
                      step="0.1"
                      placeholder="Enter actual height"
                      value={actualHeight}
                      onChange={(e) => setActualHeight(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Info alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                The system will validate the actual measurement against the category limits ({limitsDisplay}). 
                If out of range, you will be prompted to either move the participant or disqualify them based on tournament rules.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={handleRecordWeighIn} disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Weigh-In
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="w-full">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Confirmation Dialog */}
      <AlertDialog open={showValidationAlert} onOpenChange={setShowValidationAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Measurements Out of Range
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-medium text-foreground">
                Actual {validationResult?.exceededLimit} is {validationResult?.outOfRange} the category limits.
              </p>
              <p>
                The participant's actual measurement falls outside their registered category.
                {validationResult?.divisionMovePolicy === 'disqualify_only' 
                  ? ' This tournament STRICTLY requires disqualification for out-of-range measurements.'
                  : ' You can choose to move them to a different division or disqualify them.'}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            {validationResult?.divisionMovePolicy === 'allow_move' && (
              <AlertDialogAction
                onClick={() => {
                   setShowValidationAlert(false)
                   setShowDivisionMove(true)
                }}
                className="w-full bg-primary hover:bg-primary/90"
              >
                Move Division
              </AlertDialogAction>
            )}
            
            <AlertDialogAction
              onClick={() => {
                setShowValidationAlert(false)
                setShowDisqualify(true)
              }}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disqualify Participant
            </AlertDialogAction>

            <AlertDialogCancel 
              className="w-full mt-2 sm:mt-0"
              onClick={() => {
                setShowValidationAlert(false)
                onOpenChange(false) // Close main dialog too? Or just close alert? Usually "Accept" implies closing the loop.
                toast.warning('Weigh-in recorded with out-of-range values')
              }}
            >
              Accept & Close (Keep in current division)
            </AlertDialogCancel>
            
            <Button 
               variant="ghost" 
               size="sm" 
               className="mt-2"
               onClick={() => setShowValidationAlert(false)}
            >
               Back to Editing
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Division Move Dialog */}
      {showDivisionMove && validationResult && (
        <DivisionMoveDialog
          participant={participant}
          suggestedDivisions={validationResult.suggestedDivisions || []}
          actualWeight={actualWeight ? parseFloat(actualWeight) : null}
          actualHeight={actualHeight ? parseFloat(actualHeight) : null}
          tournamentId={tournamentId}
          open={showDivisionMove}
          onOpenChange={(open: boolean) => {
            setShowDivisionMove(open)
            if (!open) {
              onOpenChange(false)
            }
          }}
        />
      )}

      {/* Disqualification Dialog */}
      {showDisqualify && (
        <DisqualificationDialog
          participant={participant}
          reason={validationResult ? `Exceeded ${validationResult.exceededLimit} limit (${validationResult.outOfRange})` : 'Weight/height out of range'}
          tournamentId={tournamentId}
          open={showDisqualify}
          onOpenChange={(open: boolean) => {
            setShowDisqualify(open)
            if (!open) {
              onOpenChange(false)
            }
          }}
        />
      )}
    </>
  )
}
