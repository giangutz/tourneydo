'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertTriangle, Scale, Info, ArrowLeft, Ruler } from 'lucide-react'
import { weighInParticipant, getPredictedDivision, allowAtStatedWeight } from '@/lib/actions/participants'
import { toast } from 'sonner'
import { DivisionMoveDialog } from '@/components/tournaments/division-move-dialog'
import { DisqualificationDialog } from '@/components/tournaments/disqualification-dialog'
import { useRouter } from 'next/navigation'
import { routes } from '@/config/routes'
import { useDebounce } from 'use-debounce'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// ... existing interfaces ...
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

interface WeighInFormProps {
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
}

const getSingle = (val: any) => Array.isArray(val) ? val[0] : val

export function WeighInForm({
  participant,
  tournamentId,
  tournamentType = 'standard',
  divisionName,
  categoryName,
  categoryLimits,
}: WeighInFormProps) {
  const router = useRouter()
  
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
  
  // Debounce for prediction
  const [debouncedWeight] = useDebounce(actualWeight, 500)
  const [debouncedHeight] = useDebounce(actualHeight, 500)
  
  const [prediction, setPrediction] = useState<any>(null)
  const [isPredicting, setIsPredicting] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [showDivisionMove, setShowDivisionMove] = useState(false)
  const [showDisqualify, setShowDisqualify] = useState(false)

  const age = participant.player.dob
    ? new Date().getFullYear() - new Date(participant.player.dob).getFullYear()
    : null

  const isHeightBased = age !== null && age < 12 

  // Initial prediction based on registered details
  const [initialPrediction, setInitialPrediction] = useState<any>(null)

  // Derived display values (must be after state)
  const displayDivisionName = effectiveDivisionName || initialPrediction?.divisionName
  const displayCategoryName = effectiveCategoryName || initialPrediction?.categoryName
  
  const isPredictedAssignment = !effectiveDivisionName && !!initialPrediction

  const displayLimits = effectiveDivisionName ? effectiveLimits : (initialPrediction ? {
    minWeight: initialPrediction.minWeight,
    maxWeight: initialPrediction.maxWeight,
    minHeight: initialPrediction.minHeight,
    maxHeight: initialPrediction.maxHeight
  } : effectiveLimits)



  useEffect(() => {
    const fetchInitialPrediction = async () => {
      // Only predict if we have enough data
      if (!participant.player.dob || !participant.player.gender) return
      
      try {
        const result = await getPredictedDivision(tournamentId, {
          weight: participant.player.weight,
          height: participant.player.height,
          dob: participant.player.dob,
          gender: participant.player.gender,
          beltLevel: participant.player.belt_level
        })
        setInitialPrediction(result)
      } catch (err) {
        console.error('Initial prediction failed', err)
      }
    }
    fetchInitialPrediction()
  }, [tournamentId, participant.player])

  // Real-time prediction based on input
  // Client-side validation check (visual only)
  const isOutOfRangeClient = useMemo(() => {
    if (!displayLimits) return null
    if (isHeightBased) {
      if (!debouncedHeight) return null
      const h = parseFloat(debouncedHeight)
      const max = displayLimits.maxHeight || Infinity
      const min = displayLimits.minHeight || 0
      if (h > max) return { type: 'above', limit: max, unit: 'cm' }
      if (h < min) return { type: 'below', limit: min, unit: 'cm' }
    } else {
      if (!debouncedWeight) return null
      const w = parseFloat(debouncedWeight)
      const max = displayLimits.maxWeight || Infinity
      const min = displayLimits.minWeight || 0
      if (w > max) return { type: 'above', limit: max, unit: 'kg' }
      if (w < min) return { type: 'below', limit: min, unit: 'kg' }
    }
    return null
  }, [debouncedWeight, debouncedHeight, displayLimits, isHeightBased])

  useEffect(() => {
    const fetchPrediction = async () => {
      if ((isHeightBased && !debouncedHeight) || (!isHeightBased && !debouncedWeight)) {
        setPrediction(null)
        return
      }
      setIsPredicting(true)
      try {
        const result = await getPredictedDivision(tournamentId, {
          weight: debouncedWeight ? parseFloat(debouncedWeight) : null,
          height: debouncedHeight ? parseFloat(debouncedHeight) : null,
          dob: participant.player.dob,
          gender: participant.player.gender,
          beltLevel: participant.player.belt_level
        })
        setPrediction(result)
      } catch (err) {
        console.error(err)
      } finally {
        setIsPredicting(false)
      }
    }
    fetchPrediction()
  }, [debouncedWeight, debouncedHeight, isHeightBased, tournamentId, participant.player.dob, participant.player.gender, participant.player.belt_level])

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
        setValidationResult(result.data)
        // Dialog will be triggered by validationResult state being set
      } else {
        toast.success('Weigh-in recorded successfully')
        router.push(routes.organizer.tournamentParticipants(tournamentId))
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to record weigh-in')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAllowAndSave = async () => {
    setIsSubmitting(true)
    try {
      const result = await allowAtStatedWeight(participant.id, tournamentId)
      
      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success('Participant allowed at stated weight')
      router.push(routes.organizer.tournamentParticipants(tournamentId))
    } catch (error: any) {
      toast.error(error.message || 'Failed to allow participant')
    } finally {
      setIsSubmitting(false)
      setValidationResult(null)
    }
  }

  const formatLimits = (limits: any, type: 'weight' | 'height') => {
    if (!limits) return 'Unknown limits'
    
    if (type === 'height') {
      const min = limits.minHeight
      const max = limits.maxHeight
      if (!min && !max) return 'No height limits'
      if (!min && max) return `Under ${max} cm`
      if (min && !max) return `Over ${min} cm`
      return `${min} - ${max} cm`
    } else {
      const min = limits.minWeight
      const max = limits.maxWeight
      if ((!min || min === 0) && !max) return 'Open Weight'
      if ((!min || min === 0) && max) return `Under ${max} kg`
      if (min && !max) return `Over ${min} kg`
      return `${min} - ${max} kg`
    }
  }

  const limitsDisplay = formatLimits(displayLimits, isHeightBased ? 'height' : 'weight')

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 w-8 p-0">
           <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
           <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
             <Scale className="h-6 w-6" />
             Weigh-In Participant
           </h1>
           <p className="text-muted-foreground">
             {participant.player.first_name} {participant.player.last_name} • {participant.team.name}
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Participant Context */}
        <div className="space-y-6">
           {/* Current Assignment Card */}
             <Card className={`h-full border-l-4 ${isPredictedAssignment ? 'border-l-blue-500' : 'border-l-primary'}`}>
               <CardHeader className="pb-3">
                 <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Assigned Division</CardTitle>
                      <CardDescription>
                        {isPredictedAssignment ? 'Predicted based on registration' : 'Current registration details'}
                      </CardDescription>
                    </div>
                    {isPredictedAssignment && <Badge variant="secondary">Predicted</Badge>}
                 </div>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                     <div className="text-muted-foreground">Division</div>
                     <div className="font-medium">{displayDivisionName || 'Not assigned'}</div>
                     
                     <div className="text-muted-foreground">Category</div>
                     <div className="font-medium">{displayCategoryName || 'Not assigned'}</div>
                     
                     <div className="text-muted-foreground">Limits</div>
                     <Badge variant="outline" className="w-fit">
                        {limitsDisplay}
                     </Badge>

                   <div className="text-muted-foreground">Gender</div>
                   <div className="font-medium capitalize">{participant.player.gender}</div>

                   <div className="text-muted-foreground">Age</div>
                   <div className="font-medium">{age || '–'} years</div>
                   
                   {tournamentType === 'standard' && (
                      <>
                       <div className="text-muted-foreground">Belt</div>
                       <div className="font-medium">{participant.player.belt_level || '–'}</div>
                      </>
                   )}
                </div>

                <div className="bg-muted/50 p-3 rounded-md text-sm">
                   <div className="flex justify-between items-center mb-1">
                      <span className="text-muted-foreground">Registered Weight</span>
                      <span className="font-semibold">{participant.player.weight ? `${participant.player.weight} kg` : '–'}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Registered Height</span>
                      <span className="font-semibold">{participant.player.height ? `${participant.player.height} cm` : '–'}</span>
                   </div>
                </div>
             </CardContent>
           </Card>
        </div>

        {/* Right Column: Dynamic Input & Prediction */}
        <div className="space-y-6">
            <Card className="border-2 shadow-sm">
               <CardHeader className="bg-muted/5 pb-4">
                 <CardTitle className="text-lg flex items-center justify-between">
                    <span>Measurements</span>
                    <Badge variant={isHeightBased ? 'secondary' : 'default'}>
                       {isHeightBased ? 'Height Based' : 'Weight Based'}
                    </Badge>
                 </CardTitle>
               </CardHeader>
               <CardContent className="pt-6 space-y-6">
                  <div className="space-y-4">
                    {!isHeightBased ? (
                      <div>
                        <Label htmlFor="actual-weight" className="text-base mb-2 block">Actual Weight (kg)</Label>
                        <div className="relative">
                           <Input
                             id="actual-weight"
                             type="number"
                             step="0.01"
                             placeholder="0.00"
                             onInput={(e: any) => {
                               const value = e.target.value
                               if (value.includes('.') && value.split('.')[1].length > 2) {
                                 e.target.value = parseFloat(value).toFixed(2)
                                 setActualWeight(e.target.value) // Assuming setActualWeight is the handler
                               }
                             }}
                             value={actualWeight}
                             onChange={(e) => setActualWeight(e.target.value)}
                             disabled={isSubmitting}
                             className="text-3xl h-16 p-6 font-mono tracking-tight"
                             autoFocus
                           />
                           <span className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">kg</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="actual-height" className="text-base mb-2 block">Actual Height (cm)</Label>
                        <div className="relative">
                          <Input
                            id="actual-height"
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            value={actualHeight}
                            onChange={(e) => setActualHeight(e.target.value)}
                            disabled={isSubmitting}
                            className="text-3xl h-16 p-6 font-mono tracking-tight"
                            autoFocus
                           />
                           <span className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">cm</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Prediction Result */}
                  {(debouncedWeight || debouncedHeight) && (
                     <div className="space-y-4">
                       {/* Client Side Warning */}
                       {isOutOfRangeClient && (
                         <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-50 border border-orange-200 text-orange-800">
                            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                            <div className="text-sm">
                              <p className="font-semibold">Exceeds Limit</p>
                              <p>
                                The input {isOutOfRangeClient.limit} {isOutOfRangeClient.unit} is {isOutOfRangeClient.type} the limit for the assigned division.
                              </p>
                            </div>
                         </div>
                       )}

                       <div className={`p-4 rounded-lg border transition-all duration-300 ${
                         prediction?.match 
                           ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900' 
                           : 'bg-gray-50 border-gray-100'
                       }`}>
                          <div className="flex items-start gap-3">
                             {isPredicting ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-0.5" />
                             ) : (
                                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                             )}
                             <div className="flex-1 space-y-1">
                                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                                   Predicted Division ({isHeightBased ? 'Height' : 'Weight'}-based)
                                </p>
                                {prediction ? (
                                   <div className="font-medium text-foreground">
                                      {prediction.divisionName} • {prediction.categoryName} <br/>
                                      <span className="text-xs text-muted-foreground normal-case font-normal">
                                         Limits: {formatLimits(prediction, isHeightBased ? 'height' : 'weight')}
                                      </span>
                                   </div>
                                ) : (
                                   <p className="text-sm text-muted-foreground">Calculating match...</p>
                                )}
                             </div>
                          </div>
                       </div>
                     </div>
                  )}
               </CardContent>
               <CardFooter className="bg-muted/10 border-t p-6 flex flex-col sm:flex-row gap-3 justify-end">
                   <Button variant="ghost" onClick={() => router.back()} disabled={isSubmitting}>
                      Cancel
                   </Button>
                   <Button onClick={handleRecordWeighIn} disabled={isSubmitting} size="lg" className="w-full sm:w-auto min-w-[120px]">
                     {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Confirm Weigh-In
                   </Button>
               </CardFooter>
            </Card>
        </div>
      </div>

      {/* Confirmation/Action Dialog for Out-of-Range */}
      <AlertDialog open={!!validationResult} onOpenChange={(open) => {
        if (!open) setValidationResult(null)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
               <AlertTriangle className="h-5 w-5" />
               Measurements Out of Range
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                 Measured <strong>{validationResult?.exceededLimit === 'height' ? actualHeight + 'cm' : actualWeight + 'kg'}</strong> is <strong>{validationResult?.outOfRange}</strong> the limit for {effectiveDivisionName} - {effectiveCategoryName}.
              </p>
              <div className="p-3 bg-muted rounded-md text-sm">
                 <strong>Policy:</strong> {validationResult?.divisionMovePolicy === 'disqualify_only' 
                   ? 'Strict - Participants must be disqualified.'
                   : 'Flexible - You can move the participant to a suggested division.'}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
             <Button variant="outline" onClick={() => setValidationResult(null)}>Cancel</Button>
             
             {validationResult?.divisionMovePolicy === 'allow_move' && (
                <Button 
                  onClick={() => setShowDivisionMove(true)}
                  disabled={!validationResult.suggestedDivisions?.length}
                >
                  Move to Suggested
                </Button>
              )}
             
             <Button variant="destructive" onClick={() => setShowDisqualify(true)}>
               Disqualify
             </Button>
             
             <Button variant="secondary" onClick={handleAllowAndSave}>
               Allow & Save
             </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
           if (!open) setValidationResult(null) 
         }}
         onSuccess={() => {
            router.push(routes.organizer.weighIn(tournamentId))
            setValidationResult(null)
         }}
        />
      )}
      
      {showDisqualify && (
          <DisqualificationDialog
          participant={participant}
          reason={
             validationResult 
             ? `Automatic Disqualification: Measured ${validationResult.exceededLimit} (${validationResult.exceededLimit === 'height' ? actualHeight + 'cm' : actualWeight + 'kg'}) was ${validationResult.outOfRange} the limit for ${effectiveDivisionName} - ${effectiveCategoryName}.`
             : ''
          }
          tournamentId={tournamentId}
          open={showDisqualify}
          onOpenChange={setShowDisqualify}
          onSuccess={() => {
             router.push(routes.organizer.weighIn(tournamentId))
          }}
          />
      )}
    </>
  )
}
