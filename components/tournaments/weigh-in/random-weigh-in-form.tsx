'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertTriangle, Scale, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { submitWeighInResult } from '@/lib/actions/weigh-in'
import { toast } from 'sonner'
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
} from '@/components/ui/alert-dialog'

interface Participant {
  id: string
  tournament_id: string
  player: {
    first_name: string
    last_name: string
    weight: number | null
    dob: string
    gender: 'male' | 'female'
    belt_level: string | null
  }
  team: {
    name: string
  }
  actual_weight: number | null
}

interface RandomWeighInFormProps {
  participant: Participant
  tournamentId: string
  divisionName?: string
  categoryName?: string
  categoryMaxWeight: number | null
}

export function RandomWeighInForm({
  participant,
  tournamentId,
  divisionName,
  categoryName,
  categoryMaxWeight,
}: RandomWeighInFormProps) {
  const router = useRouter()
  const [actualWeight, setActualWeight] = useState<string>(participant.actual_weight?.toString() || '')
  const [debouncedWeight] = useDebounce(actualWeight, 300)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ passed: boolean; message: string } | null>(null)
  const [showDQConfirm, setShowDQConfirm] = useState(false)

  const toleranceLimit = categoryMaxWeight != null ? categoryMaxWeight * 1.05 : null

  const clientStatus = useMemo(() => {
    if (!debouncedWeight || toleranceLimit == null) return null
    const w = parseFloat(debouncedWeight)
    if (isNaN(w)) return null
    return w <= toleranceLimit ? 'pass' : 'fail'
  }, [debouncedWeight, toleranceLimit])

  const doSubmit = async (weight: number) => {
    setIsSubmitting(true)
    setShowDQConfirm(false)
    try {
      const res = await submitWeighInResult(participant.id, weight, tournamentId)
      const passed = res.success && !res.message.toLowerCase().includes('disqualified') && !res.message.toLowerCase().includes('failed')
      setResult({ passed, message: res.message })
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to submit weigh-in'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    const weight = parseFloat(actualWeight)
    if (!actualWeight || isNaN(weight)) {
      toast.error('Please enter actual weight')
      return
    }

    // Weight exceeds tolerance — require explicit DQ confirmation before firing the action
    if (clientStatus === 'fail') {
      setShowDQConfirm(true)
      return
    }

    await doSubmit(weight)
  }

  const handleDone = () => {
    router.push(routes.organizer.randomweighIn(tournamentId))
  }

  if (result) {
    return (
      <div className="flex items-center gap-4 flex-col max-w-md mx-auto mt-16">
        <div className={`rounded-full p-6 ${result.passed ? 'bg-green-100' : 'bg-red-100'}`}>
          {result.passed
            ? <CheckCircle className="h-16 w-16 text-green-600" />
            : <XCircle className="h-16 w-16 text-red-600" />
          }
        </div>
        <h2 className={`text-3xl font-bold ${result.passed ? 'text-green-700' : 'text-red-700'}`}>
          {result.passed ? 'Passed' : 'Failed — Disqualified'}
        </h2>
        <p className="text-center text-muted-foreground">{result.message}</p>
        <p className="text-center font-medium">
          {participant.player.first_name} {participant.player.last_name} • {participant.team.name}
        </p>
        {!result.passed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 text-center">
            Participant has been automatically disqualified and any active match has been forfeited.
          </div>
        )}
        <Button onClick={handleDone} size="lg" className="mt-4 w-full">
          Back to Random Weigh-In List
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 w-8 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Scale className="h-6 w-6" />
            Random Weigh-In Check
          </h1>
          <p className="text-muted-foreground">
            {participant.player.first_name} {participant.player.last_name} • {participant.team.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Participant info */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Weight Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="text-muted-foreground">Division</div>
              <div className="font-medium">{divisionName || '—'}</div>

              <div className="text-muted-foreground">Category</div>
              <div className="font-medium">{categoryName || '—'}</div>

              <div className="text-muted-foreground">Max Weight</div>
              <div className="font-medium">
                {categoryMaxWeight != null ? `${categoryMaxWeight} kg` : '—'}
              </div>

              <div className="text-muted-foreground">Tolerance Limit</div>
              <div className="font-medium text-amber-700">
                {toleranceLimit != null ? `${toleranceLimit.toFixed(2)} kg (+5%)` : '—'}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900">
              <strong>Rule:</strong> Athlete must not exceed 5% over the category maximum weight.
              Exceeding {toleranceLimit != null ? `${toleranceLimit.toFixed(2)} kg` : 'the limit'} results in automatic disqualification.
            </div>

            <div className="bg-muted/50 p-3 rounded-md text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Registered Weight</span>
                <span className="font-semibold">{participant.player.weight ? `${participant.player.weight} kg` : '—'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Weight input */}
        <Card className="border-2 shadow-sm">
          <CardHeader className="bg-muted/5 pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Actual Weight</span>
              <Badge variant="default">Weight Based</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div>
              <Label htmlFor="actual-weight" className="text-base mb-2 block">Actual Weight (kg)</Label>
              <div className="relative">
                <Input
                  id="actual-weight"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={actualWeight}
                  onChange={(e) => setActualWeight(e.target.value)}
                  onInput={(e: React.FormEvent<HTMLInputElement>) => {
                    const target = e.target as HTMLInputElement
                    if (target.value.includes('.') && target.value.split('.')[1].length > 2) {
                      target.value = parseFloat(target.value).toFixed(2)
                      setActualWeight(target.value)
                    }
                  }}
                  disabled={isSubmitting}
                  className="text-3xl h-16 p-6 font-mono tracking-tight"
                  autoFocus
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">kg</span>
              </div>
            </div>

            {/* Real-time status indicator */}
            {debouncedWeight && clientStatus && (
              <div className={`flex items-start gap-3 p-4 rounded-lg border ${
                clientStatus === 'pass'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {clientStatus === 'pass'
                  ? <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" />
                  : <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                }
                <div className="text-sm">
                  <p className="font-semibold">
                    {clientStatus === 'pass' ? 'Within tolerance' : 'Exceeds tolerance limit'}
                  </p>
                  <p>
                    {parseFloat(debouncedWeight).toFixed(2)} kg vs limit {toleranceLimit?.toFixed(2)} kg
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-muted/10 border-t p-6 flex flex-col sm:flex-row gap-3 justify-end">
            <Button variant="ghost" onClick={() => router.back()} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !actualWeight}
              size="lg"
              className="w-full sm:w-auto min-w-[120px]"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Weigh-In
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* DQ Confirmation Dialog — shown when submitted weight exceeds the tolerance limit */}
      <AlertDialog open={showDQConfirm} onOpenChange={setShowDQConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Disqualification
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  <strong>{participant.player.first_name} {participant.player.last_name}</strong> weighed{' '}
                  <strong>{parseFloat(actualWeight || '0').toFixed(2)} kg</strong>, which exceeds the
                  tolerance limit of <strong>{toleranceLimit?.toFixed(2)} kg</strong>.
                </p>
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                  This will permanently disqualify the athlete and forfeit their bracket match.
                  This action cannot be undone and the athlete cannot re-weigh-in.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => doSubmit(parseFloat(actualWeight))}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Disqualification
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
