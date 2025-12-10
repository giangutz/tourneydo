import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Match } from '@/types/models'
import { updateMatchParticipants, moveParticipantToDivision } from '@/lib/actions/matches'
import { toast } from 'sonner'
import { Loader2, ArrowLeftRight, MoveRight } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface MatchParticipantsDialogProps {
  match: Match | null
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: any[]
  divisions?: { id: string; label: string; divisionId: string | null; categoryId: string | null }[]
}

export function MatchParticipantsDialog({ match, open, onOpenChange, participants, divisions = [] }: MatchParticipantsDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [player1Id, setPlayer1Id] = useState<string>('')
  const [player2Id, setPlayer2Id] = useState<string>('')
  const [movingPlayerId, setMovingPlayerId] = useState<string | null>(null)
  const [targetDivision, setTargetDivision] = useState<string>('')

  // Initialize state when match changes
  useEffect(() => {
    if (match && open) {
      setPlayer1Id(match.player1_id || 'bye')
      setPlayer2Id(match.player2_id || 'bye')
    }
  }, [match, open])

  const handleSave = async () => {
    if (!match) return

    setLoading(true)
    try {
      const p1 = player1Id === 'bye' ? null : player1Id
      const p2 = player2Id === 'bye' ? null : player2Id

      const result = await updateMatchParticipants(match.id, match.tournament_id, p1, p2)

      if (result.success) {
        toast.success('Match participants updated')
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update participants')
      }
    } catch (error) {
      toast.error('Failed to update participants')
    } finally {
      setLoading(false)
    }
  }

  const handleSwap = () => {
    const temp = player1Id
    setPlayer1Id(player2Id)
    setPlayer2Id(temp)
  }

  const handleMovePlayer = async () => {
    if (!match || !movingPlayerId || !targetDivision) return

    setLoading(true)
    try {
      const division = divisions.find(d => d.id === targetDivision)
      if (!division || !division.divisionId || !division.categoryId) {
        toast.error('Invalid division selected')
        return
      }

      const result = await moveParticipantToDivision(
        match.id,
        match.tournament_id,
        movingPlayerId,
        division.divisionId,
        division.categoryId
      )

      if (result.success) {
        toast.success('Player moved to new division')
        setMovingPlayerId(null)
        setTargetDivision('')
        // If the moved player was player1 or player2, update local state to 'bye'
        if (player1Id === movingPlayerId) setPlayer1Id('bye')
        if (player2Id === movingPlayerId) setPlayer2Id('bye')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to move player')
      }
    } catch (error) {
      toast.error('Failed to move player')
    } finally {
      setLoading(false)
    }
  }

  if (!match) return null

  // Filter participants to only show those in the same division/category
  // Or show all but group them? User said "only show the players in the current division".
  // We check if participant's division_id/category_id matches the match's.
  // If participant doesn't have division info (legacy), we might include them if they are in NO match?
  // For now, let's try to filter strictly if data is available.
  
  const filteredParticipants = participants.filter(p => {
    // If participant has division info, check match
    if (p.division_id && p.category_id) {
      return p.division_id === match.division_id && p.category_id === match.category_id
    }
    // If no division info, maybe include them? Or exclude?
    // User wants to avoid mixing up. So strict filtering is safer.
    // BUT, if we just added division_id to type but DB is not populated, everyone will disappear.
    // Let's assume DB is populated or we fallback to showing everyone if no division info?
    // No, user specifically asked to filter.
    // Let's include them if they match OR if they have no division assigned (so they can be assigned).
    return (!p.division_id && !p.category_id) || (p.division_id === match.division_id && p.category_id === match.category_id)
  })

  const sortedParticipants = [...filteredParticipants].sort((a, b) => 
    (a.player.first_name + a.player.last_name).localeCompare(b.player.first_name + b.player.last_name)
  )

  const renderPlayerSelect = (value: string, onChange: (val: string) => void, label: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {value !== 'bye' && value !== '' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                onClick={() => {
                  setMovingPlayerId(value)
                  setTargetDivision('')
                }}
              >
                <MoveRight className="mr-1 h-3 w-3" />
                Move Division
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Move to Division</h4>
                <Select value={targetDivision} onValueChange={setTargetDivision}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  className="w-full h-8 text-xs" 
                  onClick={handleMovePlayer}
                  disabled={loading || !targetDivision}
                >
                  {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Confirm Move
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select player" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="bye">BYE / TBD</SelectItem>
          {sortedParticipants.map((p) => (
            <SelectItem key={p.player_id} value={p.player_id}>
              {p.player.first_name} {p.player.last_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Match Participants</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex flex-col gap-4">
            {renderPlayerSelect(player1Id, setPlayer1Id, "Player 1 (Top)")}

            <div className="flex justify-center">
              <Button variant="outline" size="icon" onClick={handleSwap} title="Swap Players">
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </div>

            {renderPlayerSelect(player2Id, setPlayer2Id, "Player 2 (Bottom)")}
          </div>
          
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <p>Note: Swapping players here will also swap them in any other matches they are assigned to in this division.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
