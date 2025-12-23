'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Match } from '@/types/models'
import { saveMatchScores } from '@/lib/actions/save-match-scores'
import { fetchMatchRounds } from '@/lib/actions/fetch-match-rounds'
import { toast } from 'sonner'
import { Loader2, Trophy, CheckCircle2 } from 'lucide-react'
import { updateMatchRoundScore } from '@/lib/actions/match-rounds'
import { type } from 'os'

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

  useEffect(() => {
    if (match && open) {
      loadRounds()
      // Reset manual winners
      setManualWinner1(null)
      setManualWinner2(null)
      setManualWinner3(null)
    }
  }, [match, open])

  const loadRounds = async () => {
    if (!match) return
    
    setLoading(true)
    try {
      const roundsData = await fetchMatchRounds(match.id)
      
      // Populate scores from existing data
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
      console.error('Failed to load rounds:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!match) return null

  const p1 = participants.find(p => p.player_id === match.player1_id)
  const p2 = participants.find(p => p.player_id === match.player2_id)
  
  const name1 = p1 ? `${p1.player.first_name} ${p1.player.last_name}` : 'TBD'
  const name2 = p2 ? `${p2.player.first_name} ${p2.player.last_name}` : 'TBD'

  // Calculate round wins (only from completed rounds 1 & 2 for UI display)
  // Don't include Round 3 in real-time calculation to allow both inputs
  let player1Wins = 0
  let player2Wins = 0

  // Determine winner for Round 1
  const r1Winner = manualWinner1 || (round1Score1 > round1Score2 ? match.player1_id : round1Score2 > round1Score1 ? match.player2_id : null)
  if (r1Winner === match.player1_id) player1Wins++
  else if (r1Winner === match.player2_id) player2Wins++

  // Determine winner for Round 2
  const r2Winner = manualWinner2 || (round2Score1 > round2Score2 ? match.player1_id : round2Score2 > round2Score1 ? match.player2_id : null)
  if (r2Winner === match.player1_id) player1Wins++
  else if (r2Winner === match.player2_id) player2Wins++

  // Determine winner for Round 3
  const r3Winner = manualWinner3 || (round3Score1 > round3Score2 ? match.player1_id : round3Score2 > round3Score1 ? match.player2_id : null)
  
  const round3Winner = r3Winner === match.player1_id ? name1 : r3Winner === match.player2_id ? name2 : null

  const matchDecided = player1Wins >= 2 || player2Wins >= 2
  
  // Winner determination: calc from rounds first, fallback to DB winner if match completed (e.g. forfeit)
  const dbWinnerName = match.winner_id ? (match.winner_id === match.player1_id ? name1 : name2) : null
  const overallWinner = (player1Wins >= 2 ? name1 : player2Wins >= 2 ? name2 : null) || (match.status === 'completed' ? dbWinnerName : null)

  // Check for DQ win
  const loserId = match.winner_id === match.player1_id ? match.player2_id : match.player1_id
  const loser = participants.find(p => p.player_id === loserId)
  const isWinByDQ = loser && loser.disqualified && match.status === 'completed'

  const handleSaveAll = async () => {
    if (!match) return

    // Validate tie-breaks
    if (round1Score1 === round1Score2 && !manualWinner1 && (round1Score1 !== 0 || round1Score2 !== 0)) {
      toast.error('Round 1: Scores are tied. Please select a winner.')
      return
    }
    if (round2Score1 === round2Score2 && !manualWinner2 && (round2Score1 !== 0 || round2Score2 !== 0)) {
      toast.error('Round 2: Scores are tied. Please select a winner.')
      return
    }
    if (round3Score1 === round3Score2 && !manualWinner3 && (round3Score1 !== 0 || round3Score2 !== 0)) {
      toast.error('Round 3: Scores are tied. Please select a winner.')
      return
    }

    setSaving(true)
    try {
      const result = await saveMatchScores(match.id, {
        round1: { player1: round1Score1, player2: round1Score2, winnerId: manualWinner1 },
        round2: { player1: round2Score1, player2: round2Score2, winnerId: manualWinner2 },
        round3: { player1: round3Score1, player2: round3Score2, winnerId: manualWinner3 }
      })

      if (result.success) {
        if (result.hasWinner) {
          toast.success(`Match complete! Winner advanced to next round.`)
        } else {
          toast.success('Match scores saved')
        }
        onOpenChange(false)
        // Refresh the page to show updated bracket
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to save scores')
      }
    } catch (error) {
      toast.error('Failed to save scores')
    } finally {
      setSaving(false)
    }
  }

  const getRoundWinner = (score1: number, score2: number) => {
    if (score1 > score2) return name1
    if (score2 > score1) return name2
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Match Result - Best of 3</DialogTitle>
          <div className="text-sm text-muted-foreground mt-2">
            First player to win 2 rounds wins the match
          </div>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall Score */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="text-center">
                    <div className="font-bold text-lg">{name1}</div>
                    <div className="text-3xl font-bold mt-2">{player1Wins}</div>
                  </div>
                  <div className="text-center text-muted-foreground font-semibold">
                    ROUNDS WON
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg">{name2}</div>
                    <div className="text-3xl font-bold mt-2">{player2Wins}</div>
                  </div>
                </div>
                {overallWinner && (
                  <div className="mt-4 text-center">
                    <Badge className="text-sm py-1 px-3">
                      <Trophy className="h-4 w-4 mr-1" />
                      Winner: {overallWinner} {isWinByDQ && '(Disqualification)'}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Round 1 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Round 1</h3>
                  {getRoundWinner(round1Score1, round1Score2) && (
                    <Badge variant="secondary">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {getRoundWinner(round1Score1, round1Score2)}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col md:grid md:grid-cols-5 gap-4 items-center mb-4">
                  <div className="w-full md:col-span-2">
                    <label className="md:hidden text-xs text-muted-foreground mb-1 block">{name1}</label>
                    <Input
                      type="number"
                      value={round1Score1}
                      onChange={(e) => setRound1Score1(Number(e.target.value))}
                      className="text-center text-lg"
                      placeholder="0"
                    />
                  </div>
                  <div className="text-center font-bold text-muted-foreground py-2 md:py-0">VS</div>
                  <div className="w-full md:col-span-2">
                    <label className="md:hidden text-xs text-muted-foreground mb-1 block">{name2}</label>
                    <Input
                      type="number"
                      value={round1Score2}
                      onChange={(e) => setRound1Score2(Number(e.target.value))}
                      className="text-center text-lg"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {/* Manual Winner Selection for Tie-Break */}
                {round1Score1 === round1Score2 && (
                  <div className="flex justify-center gap-4 mt-4 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="r1-p1" 
                        name="round1-winner" 
                        checked={manualWinner1 === match.player1_id}
                        onChange={() => setManualWinner1(match.player1_id)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="r1-p1" className="text-sm font-medium cursor-pointer">{name1}</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="r1-p2" 
                        name="round1-winner" 
                        checked={manualWinner1 === match.player2_id}
                        onChange={() => setManualWinner1(match.player2_id)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="r1-p2" className="text-sm font-medium cursor-pointer">{name2}</label>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Round 2 */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Round 2</h3>
                  {getRoundWinner(round2Score1, round2Score2) && (
                    <Badge variant="secondary">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {getRoundWinner(round2Score1, round2Score2)}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col md:grid md:grid-cols-5 gap-4 items-center mb-4">
                  <div className="w-full md:col-span-2">
                    <label className="md:hidden text-xs text-muted-foreground mb-1 block">{name1}</label>
                    <Input
                      type="number"
                      value={round2Score1}
                      onChange={(e) => setRound2Score1(Number(e.target.value))}
                      className="text-center text-lg"
                      placeholder="0"
                    />
                  </div>
                  <div className="text-center font-bold text-muted-foreground py-2 md:py-0">VS</div>
                  <div className="w-full md:col-span-2">
                    <label className="md:hidden text-xs text-muted-foreground mb-1 block">{name2}</label>
                    <Input
                      type="number"
                      value={round2Score2}
                      onChange={(e) => setRound2Score2(Number(e.target.value))}
                      className="text-center text-lg"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {/* Manual Winner Selection for Tie-Break */}
                {round2Score1 === round2Score2 && (
                  <div className="flex justify-center gap-4 mt-4 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="r2-p1" 
                        name="round2-winner" 
                        checked={manualWinner2 === match.player1_id}
                        onChange={() => setManualWinner2(match.player1_id)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="r2-p1" className="text-sm font-medium cursor-pointer">{name1}</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="r2-p2" 
                        name="round2-winner" 
                        checked={manualWinner2 === match.player2_id}
                        onChange={() => setManualWinner2(match.player2_id)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="r2-p2" className="text-sm font-medium cursor-pointer">{name2}</label>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Round 3 */}
            <Card className={matchDecided ? 'opacity-50' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Round 3</h3>
                  {matchDecided && (
                    <Badge variant="outline">Not Needed</Badge>
                  )}
                  {round3Winner && (
                    <Badge variant="secondary">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {round3Winner}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col md:grid md:grid-cols-5 gap-4 items-center mb-4">
                  <div className="w-full md:col-span-2">
                    <label className="md:hidden text-xs text-muted-foreground mb-1 block">{name1}</label>
                    <Input
                      type="number"
                      value={round3Score1}
                      onChange={(e) => setRound3Score1(Number(e.target.value))}
                      className="text-center text-lg"
                      placeholder="0"
                      disabled={false}
                    />
                  </div>
                  <div className="text-center font-bold text-muted-foreground py-2 md:py-0">VS</div>
                  <div className="w-full md:col-span-2">
                    <label className="md:hidden text-xs text-muted-foreground mb-1 block">{name2}</label>
                    <Input
                      type="number"
                      value={round3Score2}
                      onChange={(e) => setRound3Score2(Number(e.target.value))}
                      className="text-center text-lg"
                      placeholder="0"
                      disabled={false}
                    />
                  </div>
                </div>
                
                {/* Manual Winner Selection for Tie-Break */}
                {round3Score1 === round3Score2 && (
                  <div className="flex justify-center gap-4 mt-4 p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="r3-p1" 
                        name="round3-winner" 
                        checked={manualWinner3 === match.player1_id}
                        onChange={() => setManualWinner3(match.player1_id)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="r3-p1" className="text-sm font-medium cursor-pointer">{name1}</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id="r3-p2" 
                        name="round3-winner" 
                        checked={manualWinner3 === match.player2_id}
                        onChange={() => setManualWinner3(match.player2_id)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="r3-p2" className="text-sm font-medium cursor-pointer">{name2}</label>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSaveAll} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Match Result
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}





