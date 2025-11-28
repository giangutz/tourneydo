'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Match } from '@/types/models'
import { updateMatchResult } from '@/lib/actions/matches'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface MatchResultDialogProps {
  match: Match | null
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: any[]
}

export function MatchResultDialog({ match, open, onOpenChange, participants }: MatchResultDialogProps) {
  const [score1, setScore1] = useState(match?.score_player1 || 0)
  const [score2, setScore2] = useState(match?.score_player2 || 0)
  const [loading, setLoading] = useState(false)

  if (!match) return null

  const p1 = participants.find(p => p.player_id === match.player1_id)
  const p2 = participants.find(p => p.player_id === match.player2_id)
  
  const name1 = p1 ? `${p1.player.first_name} ${p1.player.last_name}` : 'TBD'
  const name2 = p2 ? `${p2.player.first_name} ${p2.player.last_name}` : 'TBD'

  const handleSave = async () => {
    setLoading(true)
    try {
      // Determine winner based on score
      let winnerId = null
      if (score1 > score2) winnerId = match.player1_id
      if (score2 > score1) winnerId = match.player2_id
      
      // If scores are equal, we can't complete the match (unless draw allowed, but single elimination usually needs winner)
      if (score1 === score2) {
        toast.error("Scores cannot be equal in elimination match")
        setLoading(false)
        return
      }

      const result = await updateMatchResult(match.id, match.tournament_id, {
        score_player1: score1,
        score_player2: score2,
        winner_id: winnerId,
        status: 'completed'
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Match result updated")
        onOpenChange(false)
      }
    } catch (err) {
      toast.error("Failed to update match")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter Match Result</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-4 items-center py-4">
          <div className="text-center">
            <div className="font-bold mb-2">{name1}</div>
            <Input 
              type="number" 
              value={score1} 
              onChange={(e) => setScore1(Number(e.target.value))}
              className="text-center text-lg"
            />
          </div>
          
          <div className="text-center font-bold text-muted-foreground">VS</div>
          
          <div className="text-center">
            <div className="font-bold mb-2">{name2}</div>
            <Input 
              type="number" 
              value={score2} 
              onChange={(e) => setScore2(Number(e.target.value))}
              className="text-center text-lg"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || !match.player1_id || !match.player2_id}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Result
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
