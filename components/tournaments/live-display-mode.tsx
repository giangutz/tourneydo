'use client'

import { Match, Tournament } from '@/types/models'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LiveDisplayModeProps {
  tournament: Tournament
  matches: Match[]
  participants: any[]
  onClose: () => void
}

export function LiveDisplayMode({ tournament, matches, participants, onClose }: LiveDisplayModeProps) {
  const courts = Array.from({ length: tournament.courts || 0 }, (_, i) => i + 1)

  const getPlayerDisplay = (playerId: string | null) => {
    if (!playerId) return { name: 'BYE', team: null }
    const p = participants.find(p => p.player_id === playerId)
    if (!p) return { name: 'TBD', team: null }
    
    return {
      name: `${p.player.first_name} ${p.player.last_name}`,
      team: p.team?.name || 'Unattached'
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 overflow-hidden">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">{tournament.name}</h1>
            <p className="text-blue-200 text-lg">Live Match Display</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm text-blue-200">Current Time</div>
              <div className="text-2xl font-bold text-white">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-12 w-12"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Courts Grid */}
      <div className="h-[calc(100vh-120px)] p-6 overflow-hidden">
        <div 
          className="grid gap-4 h-full"
          style={{
            gridTemplateColumns: courts.length <= 2 ? `repeat(${courts.length}, 1fr)` : 
                                 courts.length <= 4 ? 'repeat(2, 1fr)' : 
                                 'repeat(3, 1fr)',
            gridTemplateRows: courts.length <= 2 ? '1fr' :
                             courts.length <= 4 ? 'repeat(2, 1fr)' :
                             courts.length <= 6 ? 'repeat(2, 1fr)' :
                             'repeat(3, 1fr)'
          }}
        >
          {courts.map((courtNumber) => {
            const courtMatches = matches.filter(m => m.court_number === courtNumber)
            const currentMatch = courtMatches.find(m => m.status === 'in_progress')
            const queuedMatches = courtMatches
              .filter(m => m.status === 'scheduled')
              .sort((a, b) => (a.match_number || 0) - (b.match_number || 0))
              .slice(0, 1) // Show only next queued match

            return (
              <div
                key={courtNumber}
                className={`rounded-2xl border-2 overflow-hidden flex flex-col ${
                  currentMatch 
                    ? 'bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-400' 
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {/* Court Header */}
                <div className={`px-6 py-4 border-b ${
                  currentMatch ? 'bg-blue-600/30 border-blue-400/30' : 'bg-white/5 border-white/10'
                }`}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold text-white">Court {courtNumber}</h2>
                    {currentMatch && (
                      <Badge className="bg-red-500 text-white text-lg px-4 py-1 animate-pulse">
                        LIVE
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Current Match */}
                <div className="flex-1 flex flex-col justify-center p-6">
                  {currentMatch ? (
                    <div className="space-y-4">
                      <div className="text-center text-blue-200 text-sm font-medium mb-2">
                        Match #{currentMatch.match_number} • Round {currentMatch.round}
                      </div>
                      
                      {/* Player 1 */}
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="text-2xl font-bold text-white mb-1">
                          {getPlayerDisplay(currentMatch.player1_id).name}
                        </div>
                        <div className="text-blue-200 text-sm">
                          {getPlayerDisplay(currentMatch.player1_id).team}
                        </div>
                      </div>

                      <div className="text-center text-white text-xl font-bold">VS</div>

                      {/* Player 2 */}
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="text-2xl font-bold text-white mb-1">
                          {getPlayerDisplay(currentMatch.player2_id).name}
                        </div>
                        <div className="text-blue-200 text-sm">
                          {getPlayerDisplay(currentMatch.player2_id).team}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🏆</div>
                      <div className="text-2xl text-white/60 font-medium">Court Available</div>
                    </div>
                  )}
                </div>

                {/* Queue - Single Next Match */}
                {queuedMatches[0] && (
                  <div className="border-t border-white/10 bg-black/40 px-6 py-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/50 hover:bg-blue-500/30">
                        NEXT UP
                      </Badge>
                      <span className="text-blue-200/80 text-sm font-medium">Match #{queuedMatches[0].match_number}</span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold text-lg truncate">
                          {getPlayerDisplay(queuedMatches[0].player1_id).name}
                        </div>
                        <div className="text-blue-200 text-sm truncate font-medium">
                          {getPlayerDisplay(queuedMatches[0].player1_id).team}
                        </div>
                      </div>
                      
                      <div className="text-white/40 font-bold text-sm px-2">VS</div>
                      
                      <div className="flex-1 min-w-0 text-right">
                        <div className="text-white font-semibold text-lg truncate">
                          {getPlayerDisplay(queuedMatches[0].player2_id).name}
                        </div>
                        <div className="text-blue-200 text-sm truncate font-medium">
                          {getPlayerDisplay(queuedMatches[0].player2_id).team}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
