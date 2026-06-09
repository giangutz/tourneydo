'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Match, WinMethod } from '@/types/models'
import { WIN_METHOD_LABELS } from '@/lib/constants/wt-rules'
import { saveMatchScores } from '@/lib/actions/save-match-scores'
import { rescoreMatch } from '@/lib/actions/rescore-match'
import { enqueue as enqueueOffline } from '@/lib/offline/score-queue'
import { broadcastManager } from '@/lib/realtime/broadcast'
import { fetchMatchRounds } from '@/lib/actions/fetch-match-rounds'
import { toast } from 'sonner'
import { Loader2, Trophy, CheckCircle2, Zap, RotateCcw, AlertTriangle } from 'lucide-react'

interface MatchResultDialogProps {
  match: Match | null
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: any[]
}

interface RoundData {
  id: string
  round_number: number
  score_player1: number | null
  score_player2: number | null
  winner_id: string | null
  status: string | null
}

// WT explicit early-termination methods (winner declared directly, not by score).
// Round-derived methods (PTF/PTG/GDP/SUP) flow through the normal scoring path.
const EARLY_TERMINATION_METHODS: WinMethod[] = ['RSC', 'WDR', 'DSQ', 'PUN']

export function MatchResultDialog({ match, open, onOpenChange, participants }: MatchResultDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Round scores (local state)
  const [round1Score1, setRound1Score1] = useState(0)
  const [round1Score2, setRound1Score2] = useState(0)
  const [round2Score1, setRound2Score1] = useState(0)
  const [round2Score2, setRound2Score2] = useState(0)
  const [round3Score1, setRound3Score1] = useState(0)
  const [round3Score2, setRound3Score2] = useState(0)

  // Manual winner overrides (for tie-breaks)
  const [manualWinner1, setManualWinner1] = useState<string | null>(null)
  const [manualWinner2, setManualWinner2] = useState<string | null>(null)
  const [manualWinner3, setManualWinner3] = useState<string | null>(null)

  // Win method state
  const [winMethod, setWinMethod] = useState<WinMethod>('PTF')
  const [earlyWinnerId, setEarlyWinnerId] = useState<string | null>(null)
  const [earlyRound, setEarlyRound] = useState<number | null>(null)

  // Rescore / dispute mode
  const [isRescore, setIsRescore] = useState(false)
  const [rescoreReason, setRescoreReason] = useState('')

  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    if (match && open) {
      loadRounds()
      setManualWinner1(null)
      setManualWinner2(null)
      setManualWinner3(null)
      setWinMethod('PTF')
      setEarlyWinnerId(null)
      setEarlyRound(null)
      setIsRescore(false)
      setRescoreReason('')
      setCurrentStep(1)
    }
  }, [match, open])

  const loadRounds = async () => {
    if (!match) return
    setLoading(true)
    try {
      const roundsData = await fetchMatchRounds(match.id)
      roundsData.forEach((round: RoundData) => {
        if (round.round_number === 1) {
          setRound1Score1(round.score_player1 ?? 0)
          setRound1Score2(round.score_player2 ?? 0)
          if (round.winner_id) setManualWinner1(round.winner_id)
        } else if (round.round_number === 2) {
          setRound2Score1(round.score_player1 ?? 0)
          setRound2Score2(round.score_player2 ?? 0)
          if (round.winner_id) setManualWinner2(round.winner_id)
        } else if (round.round_number === 3) {
          setRound3Score1(round.score_player1 ?? 0)
          setRound3Score2(round.score_player2 ?? 0)
          if (round.winner_id) setManualWinner3(round.winner_id)
        }
      })
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  if (!match) return null

  const p1 = participants.find(p => p.player_id === match.player1_id)
  const p2 = participants.find(p => p.player_id === match.player2_id)

  const name1 = p1 ? `${p1.player.first_name} ${p1.player.last_name}` : 'TBD'
  const name2 = p2 ? `${p2.player.first_name} ${p2.player.last_name}` : 'TBD'
  const team1 = p1?.team?.name || 'Unattached'
  const team2 = p2?.team?.name || 'Unattached'

  const isEarlyTermination = EARLY_TERMINATION_METHODS.includes(winMethod)

  // Calculate round wins dynamically (for SCORE method)
  let player1Wins = 0
  let player2Wins = 0

  const r1Winner = manualWinner1 || (round1Score1 > round1Score2 ? match.player1_id : round1Score2 > round1Score1 ? match.player2_id : null)
  if (r1Winner === match.player1_id) player1Wins++
  else if (r1Winner === match.player2_id) player2Wins++

  const r2Winner = manualWinner2 || (round2Score1 > round2Score2 ? match.player1_id : round2Score2 > round2Score1 ? match.player2_id : null)
  if (r2Winner === match.player1_id) player1Wins++
  else if (r2Winner === match.player2_id) player2Wins++

  const r3Winner = manualWinner3 || (round3Score1 > round3Score2 ? match.player1_id : round3Score2 > round3Score1 ? match.player2_id : null)
  if (r3Winner === match.player1_id) player1Wins++
  else if (r3Winner === match.player2_id) player2Wins++

  const matchDecidedByScore = player1Wins >= 2 || player2Wins >= 2

  const dbWinnerName = match.winner_id ? (match.winner_id === match.player1_id ? name1 : name2) : null
  const scoreWinnerName = player1Wins >= 2 ? name1 : player2Wins >= 2 ? name2 : null
  const earlyWinnerName = earlyWinnerId ? (earlyWinnerId === match.player1_id ? name1 : name2) : null
  const overallWinner = isEarlyTermination
    ? earlyWinnerName
    : (scoreWinnerName || (match.status === 'completed' ? dbWinnerName : null))

  const validateStep = (step: number): boolean => {
    if (step === 1 && (round1Score1 < 0 || round1Score2 < 0)) {
      toast.error('Scores cannot be negative.')
      return false
    }
    if (step === 2 && (round2Score1 < 0 || round2Score2 < 0)) {
      toast.error('Scores cannot be negative.')
      return false
    }
    if (step === 3 && (round3Score1 < 0 || round3Score2 < 0)) {
      toast.error('Scores cannot be negative.')
      return false
    }
    if (step === 1 && round1Score1 === round1Score2 && !manualWinner1 && (round1Score1 !== 0 || round1Score2 !== 0)) {
      toast.error('Round 1: Scores are tied. Please select a winner.')
      return false
    }
    if (step === 2 && round2Score1 === round2Score2 && !manualWinner2 && (round2Score1 !== 0 || round2Score2 !== 0)) {
      toast.error('Round 2: Scores are tied. Please select a winner.')
      return false
    }
    if (step === 3 && round3Score1 === round3Score2 && !manualWinner3 && (round3Score1 !== 0 || round3Score2 !== 0)) {
      toast.error('Round 3: Scores are tied. Please select a winner.')
      return false
    }
    return true
  }

  const handleNext = () => {
    if (!validateStep(currentStep)) return
    if (currentStep === 2 && matchDecidedByScore) {
      setCurrentStep(4) // Skip to Review
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep === 4 && (matchDecidedByScore || isEarlyTermination)) {
      // For early termination we go back to where they declared it
      setCurrentStep(isEarlyTermination && earlyRound ? earlyRound : 2)
    } else {
      setCurrentStep(prev => prev - 1)
    }
  }

  /**
   * Declare early termination (KO/TKO/DQ/WITHDRAWAL/FORFEIT).
   * Records which round and winner, then skips to Review.
   */
  const handleEarlyTermination = (method: WinMethod, round: number) => {
    setWinMethod(method)
    setEarlyRound(round)
    // Require winner selection before proceeding to Review
    setCurrentStep(4)
  }

  const handleSaveAll = async () => {
    // For early termination, a winner must be explicitly selected
    if (isEarlyTermination && !earlyWinnerId) {
      toast.error(`Please select the winner for the ${WIN_METHOD_LABELS[winMethod]} decision.`)
      return
    }

    if (isRescore && !rescoreReason.trim()) {
      toast.error('A reason is required when rescoring a completed match.')
      return
    }

    const scores = {
      round1: { player1: round1Score1, player2: round1Score2, winnerId: manualWinner1 },
      round2: { player1: round2Score1, player2: round2Score2, winnerId: manualWinner2 },
      round3: { player1: round3Score1, player2: round3Score2, winnerId: manualWinner3 },
    }

    setSaving(true)
    try {

      let result: { success: boolean; error?: string; hasWinner?: boolean; winnerId?: string | null; conflict?: boolean }

      if (isRescore) {
        const rescoreResult = await rescoreMatch(match.id, {
          scores,
          winMethod,
          winningRound: earlyRound ?? undefined,
          winnerId: earlyWinnerId ?? undefined,
          reason: rescoreReason.trim(),
        })
        result = rescoreResult.success
          ? { success: true, hasWinner: rescoreResult.data?.hasWinner, winnerId: rescoreResult.data?.winnerId }
          : { success: false, error: rescoreResult.error }
      } else {
        result = await saveMatchScores(
          match.id,
          scores,
          winMethod,
          earlyRound ?? undefined,
          earlyWinnerId ?? undefined,
          match.updated_at ?? undefined  // optimistic lock version
        )
      }

      if (result.success) {
        const winLabel = isEarlyTermination ? ` by ${WIN_METHOD_LABELS[winMethod]}` : ''
        if (isRescore) {
          toast.success('Match rescored successfully.')
        } else if (result.hasWinner) {
          toast.success(`Match complete${winLabel}! Winner advanced to next round.`)
        } else {
          toast.success('Match scores saved')
        }

        broadcastManager.publish(match.tournament_id, 'score_update', {
          matchId: match.id,
          scores: {
            round1: { player1: round1Score1, player2: round1Score2 },
            round2: { player1: round2Score1, player2: round2Score2 },
            round3: { player1: round3Score1, player2: round3Score2 },
          },
          winnerId: result.hasWinner ? (earlyWinnerId || manualWinner1 || manualWinner2 || manualWinner3) : null,
          winMethod,
        })

        onOpenChange(false)
        router.refresh()
      } else if ('conflict' in result && result.conflict) {
        // Another user saved scores while this dialog was open — close and reload
        toast.error('Match was updated by someone else. Reloading...')
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to save scores')
      }
    } catch (err) {
      // Network error — enqueue for offline sync (not for rescore mode)
      if (!isRescore && !navigator.onLine) {
        try {
          await enqueueOffline(
            match.id,
            scores,
            winMethod,
            earlyRound ?? undefined,
            earlyWinnerId ?? undefined
          )
          toast.warning('You are offline. Scores queued and will sync on reconnect.')
          onOpenChange(false)
        } catch {
          toast.error('Failed to save scores and could not queue for offline sync.')
        }
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to save scores')
      }
    } finally {
      setSaving(false)
    }
  }

  const getRoundWinner = (score1: number, score2: number) => {
    if (score1 > score2) return name1
    if (score2 > score1) return name2
    return null
  }

  /** Buttons for declaring early termination at a given round */
  const renderEarlyTerminationButtons = (round: number) => (
    <div className="mt-4 border-t pt-4">
      <p className="text-xs text-muted-foreground text-center mb-2 font-medium uppercase tracking-wider">
        Declare early termination
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {EARLY_TERMINATION_METHODS.map((method) => (
          <Button
            key={method}
            variant="outline"
            size="sm"
            className="text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => handleEarlyTermination(method, round)}
          >
            <Zap className="h-3 w-3 mr-1" />
            {WIN_METHOD_LABELS[method]}
          </Button>
        ))}
      </div>
    </div>
  )

  const renderRoundInput = (
    roundNum: number,
    score1: number,
    setScore1: (v: number) => void,
    score2: number,
    setScore2: (v: number) => void,
    manualWinner: string | null,
    setManualWinner: (id: string | null) => void
  ) => (
    <div className="py-4 sm:py-6">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          Scoring Round {roundNum}
        </h3>
        {getRoundWinner(score1, score2) && (
          <Badge variant="secondary" className="animate-in fade-in zoom-in px-2 py-0.5 sm:px-3 sm:py-1">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {getRoundWinner(score1, score2)}
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-6 sm:gap-10">
        <div className="grid grid-cols-2 gap-4 sm:gap-12 lg:gap-16">
          <div className="space-y-2 sm:space-y-4">
            <div className="mb-1 sm:mb-4">
              <label className="text-xs sm:text-base font-bold block truncate text-primary/90" title={name1}>
                {name1}
              </label>
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider truncate">
                {team1}
              </div>
            </div>
            <Input
              type="number"
              min="0"
              value={score1}
              onChange={(e) => setScore1(Math.max(0, Number(e.target.value)))}
              className="text-center text-3xl h-16 sm:text-7xl sm:h-32 md:text-6xl lg:h-52 font-bold bg-muted/30 border-2 border-primary/50 focus-visible:ring-primary/20"
              placeholder="0"
            />
          </div>
          <div className="space-y-2 sm:space-y-4">
            <div className="mb-1 sm:mb-4 text-right">
              <label className="text-xs sm:text-base font-bold block truncate text-primary/90" title={name2}>
                {name2}
              </label>
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider truncate">
                {team2}
              </div>
            </div>
            <Input
              type="number"
              min="0"
              value={score2}
              onChange={(e) => setScore2(Math.max(0, Number(e.target.value)))}
              className="text-center text-3xl h-16 sm:text-7xl sm:h-32 md:text-6xl lg:h-52 font-bold bg-muted/30 border-2 border-primary/50 focus-visible:ring-primary/20"
              placeholder="0"
            />
          </div>
        </div>

        {/* Tie Breaker Selection */}
        {score1 === score2 && (
          <div className="bg-muted/40 p-4 sm:p-6 rounded-xl border border-dashed animate-in slide-in-from-top-2 mt-2">
            <p className="text-sm font-medium text-muted-foreground text-center mb-3 sm:mb-5">
              Scores tied. Who wins decision?
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
              <Button
                variant={manualWinner === match.player1_id ? 'default' : 'outline'}
                onClick={() => setManualWinner(manualWinner === match.player1_id ? null : match.player1_id)}
                className={`flex-1 h-12 sm:h-14 text-xs sm:text-sm ${manualWinner === match.player1_id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              >
                {name1}
              </Button>
              <Button
                variant={manualWinner === match.player2_id ? 'default' : 'outline'}
                onClick={() => setManualWinner(manualWinner === match.player2_id ? null : match.player2_id)}
                className={`flex-1 h-12 sm:h-14 text-xs sm:text-sm ${manualWinner === match.player2_id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              >
                {name2}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Early termination buttons */}
      {renderEarlyTerminationButtons(roundNum)}
    </div>
  )

  const renderReview = () => (
    <div className="space-y-6 pt-2">
      {/* Early termination winner selector (shown when non-SCORE method was declared) */}
      {isEarlyTermination && (
        <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-xl animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-destructive" />
            <p className="text-sm font-semibold text-destructive">
              {WIN_METHOD_LABELS[winMethod]} declared in Round {earlyRound}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Select the winner:</p>
          <div className="flex gap-2">
            <Button
              variant={earlyWinnerId === match.player1_id ? 'default' : 'outline'}
              onClick={() => setEarlyWinnerId(match.player1_id)}
              className="flex-1"
            >
              {name1}
            </Button>
            <Button
              variant={earlyWinnerId === match.player2_id ? 'default' : 'outline'}
              onClick={() => setEarlyWinnerId(match.player2_id)}
              className="flex-1"
            >
              {name2}
            </Button>
          </div>
        </div>
      )}

      <div className="text-center relative py-6 bg-muted/20 rounded-xl border border-dashed">
        <h3 className="text-lg font-medium text-muted-foreground mb-4">Final Result</h3>

        {overallWinner ? (
          <div className="flex flex-col items-center gap-2 animate-in zoom-in">
            <Trophy className="h-8 w-8 text-yellow-500 mb-1" />
            <div className="text-2xl font-bold bg-linear-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
              {overallWinner}
            </div>
            <Badge variant="outline" className="mt-1">
              {isEarlyTermination
                ? `Win by ${WIN_METHOD_LABELS[winMethod]} (Round ${earlyRound})`
                : 'Match Winner'}
            </Badge>
          </div>
        ) : (
          <div className="text-xl font-semibold">Awaiting decision</div>
        )}
      </div>

      <div className="grid gap-2 text-sm">
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <span className="font-medium">Round 1</span>
          <div className="font-mono font-bold text-lg">{round1Score1} – {round1Score2}</div>
        </div>
        <div className={`flex items-center justify-between p-3 rounded-lg ${isEarlyTermination && earlyRound === 1 ? 'border border-destructive/30 bg-destructive/5' : 'bg-muted/30'}`}>
          <span className="font-medium">Round 2</span>
          {isEarlyTermination && earlyRound && earlyRound < 2 ? (
            <span className="text-muted-foreground italic text-xs">{WIN_METHOD_LABELS[winMethod]} — not played</span>
          ) : (
            <div className="font-mono font-bold text-lg">{round2Score1} – {round2Score2}</div>
          )}
        </div>
        {(!matchDecidedByScore && !isEarlyTermination) ? (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <span className="font-medium">Round 3</span>
            <div className="font-mono font-bold text-lg">{round3Score1} – {round3Score2}</div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-lg border border-dashed opacity-50">
            <span className="font-medium">Round 3</span>
            <span className="text-muted-foreground italic text-xs">
              {isEarlyTermination ? `${WIN_METHOD_LABELS[winMethod]} — not played` : 'Not Required'}
            </span>
          </div>
        )}
      </div>
    </div>
  )

  const isOnReviewStep = currentStep === 4
  const stepLabels = ['R1', 'R2', 'R3', 'Review']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full sm:max-w-2xl gap-6 sm:gap-8">
        <DialogHeader>
          <DialogTitle className="text-2xl sm:text-3xl">
            {isRescore ? 'Re-score Match' : 'Match Result'}
          </DialogTitle>
          <div className="flex gap-1.5 mt-4 sm:mt-6">
            {[1, 2, 3, 4].map(step => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  step <= currentStep ? 'bg-primary' : 'bg-muted'
                } ${step === 3 && (matchDecidedByScore || isEarlyTermination) && currentStep === 4 ? 'opacity-30' : ''}`}
              />
            ))}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 sm:py-16">
            <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin text-muted-foreground" />
          </div>
        ) : match.status === 'completed' && !isRescore ? (
          /* Completed match — show summary and offer Re-score option */
          <div className="min-h-[260px] flex flex-col items-center justify-center gap-6 py-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <Trophy className="h-10 w-10 text-amber-500" />
              <p className="text-lg font-semibold">{dbWinnerName ?? 'No winner recorded'}</p>
              <p className="text-sm text-muted-foreground">This match has been completed.</p>
              {match.win_method && match.win_method !== 'SCORE' && match.win_method !== 'PTF' && (
                <p className="text-sm text-destructive font-medium">
                  Won by {WIN_METHOD_LABELS[match.win_method as WinMethod]}
                  {match.winning_round ? ` (Round ${match.winning_round})` : ''}
                </p>
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="outline"
                className="gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                onClick={() => setIsRescore(true)}
              >
                <RotateCcw className="h-4 w-4" />
                Re-score this match
              </Button>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                Only available if the next match has not yet started.
              </p>
            </div>
          </div>
        ) : (
          <div className="min-h-[300px] sm:min-h-[400px] flex flex-col justify-center">
            {isRescore && currentStep === 1 && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                <p className="text-amber-700 dark:text-amber-400">
                  You are rescoring a completed match. The bracket will be updated with the corrected result.
                </p>
              </div>
            )}
            {currentStep === 1 && renderRoundInput(1, round1Score1, setRound1Score1, round1Score2, setRound1Score2, manualWinner1, setManualWinner1)}
            {currentStep === 2 && renderRoundInput(2, round2Score1, setRound2Score1, round2Score2, setRound2Score2, manualWinner2, setManualWinner2)}
            {currentStep === 3 && renderRoundInput(3, round3Score1, setRound3Score1, round3Score2, setRound3Score2, manualWinner3, setManualWinner3)}
            {currentStep === 4 && (
              <>
                {isRescore && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1.5">
                      Reason for rescoring <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={rescoreReason}
                      onChange={(e) => setRescoreReason(e.target.value)}
                      placeholder="e.g. Scorekeeper error in Round 2"
                      maxLength={200}
                    />
                  </div>
                )}
                {renderReview()}
              </>
            )}
          </div>
        )}

        <DialogFooter className="flex-row gap-3 sm:justify-between pt-2">
          {match.status === 'completed' && !isRescore ? (
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none sm:min-w-[120px]"
            >
              Close
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={currentStep === 1 ? () => { isRescore ? setIsRescore(false) : onOpenChange(false) } : handleBack}
                className="flex-1 sm:flex-none sm:min-w-[120px]"
              >
                {currentStep === 1 ? 'Cancel' : 'Back'}
              </Button>

              {!isOnReviewStep ? (
                <Button onClick={handleNext} className="flex-1 sm:flex-none sm:min-w-[120px]">
                  Next Round
                </Button>
              ) : (
                <Button
                  onClick={handleSaveAll}
                  disabled={saving || (isEarlyTermination && !earlyWinnerId) || (isRescore && !rescoreReason.trim())}
                  className={`flex-1 sm:flex-none sm:min-w-[150px] ${isRescore ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isRescore ? 'Confirm Rescore' : 'Submit Result'}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
