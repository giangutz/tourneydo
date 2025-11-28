'use client'

import { Match } from '@/types/models'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Trophy } from 'lucide-react'

interface BracketViewProps {
  matches: Match[]
  participants: any[] // We can type this better if needed
  onMatchClick?: (match: Match) => void
}

export function BracketView({ matches, participants, onMatchClick }: BracketViewProps) {
  // Group matches by round
  const rounds = matches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = []
    }
    acc[match.round].push(match)
    return acc
  }, {} as Record<number, Match[]>)

  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b)
  const totalRounds = roundNumbers.length

  const getPlayerName = (playerId: string | null) => {
    if (!playerId) return 'BYE'
    // Find participant details
    // This requires us to have participant data available.
    // For now, let's assume `participants` has player info.
    const p = participants.find(p => p.player_id === playerId)
    return p ? `${p.player.first_name} ${p.player.last_name}` : 'TBD'
  }

  return (
    <div className="flex overflow-x-auto pb-4">
      {roundNumbers.map((round) => (
        <div key={round} className="flex flex-col justify-around min-w-[200px] mx-4">
          <div className="text-center font-bold mb-4">
            {round === totalRounds ? 'Final' : `Round ${round}`}
          </div>
          <div className="flex flex-col justify-around flex-grow space-y-8">
            {rounds[round]
              .sort((a, b) => a.match_number - b.match_number)
              .map((match) => (
                <Card 
                  key={match.id} 
                  className={cn(
                    "cursor-pointer hover:border-primary transition-colors relative",
                    match.status === 'completed' && "bg-muted/50"
                  )}
                  onClick={() => onMatchClick?.(match)}
                >
                  <CardContent className="p-3 text-sm">
                    <div className={cn(
                      "flex justify-between items-center p-1 rounded",
                      match.winner_id === match.player1_id && "font-bold bg-green-100 dark:bg-green-900/20"
                    )}>
                      <span>{getPlayerName(match.player1_id)}</span>
                      <span>{match.score_player1}</span>
                    </div>
                    <div className="h-px bg-border my-1" />
                    <div className={cn(
                      "flex justify-between items-center p-1 rounded",
                      match.winner_id === match.player2_id && "font-bold bg-green-100 dark:bg-green-900/20"
                    )}>
                      <span>{getPlayerName(match.player2_id)}</span>
                      <span>{match.score_player2}</span>
                    </div>
                    
                    {match.status === 'scheduled' && (
                      <div className="absolute -right-2 -top-2">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                          {match.match_number}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
