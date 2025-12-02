'use client'

import { useState, useMemo } from 'react'
import { Match } from '@/types/models'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Trophy, Search, Pencil, MapPin } from 'lucide-react'
import { getBracketRoundLabel } from '@/lib/utils/bracket-generator'
import { Button } from '@/components/ui/button'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { assignMatchToCourt } from '@/lib/actions/matches'
import { toast } from 'sonner'

interface BracketViewProps {
  matches: Match[]
  participants: any[]
  onMatchClick?: (match: Match) => void
  isOrganizer?: boolean
  onEditMatch?: (match: Match) => void
  courts?: number
}

export function BracketView({ matches, participants, onMatchClick, isOrganizer = false, onEditMatch, courts = 0 }: BracketViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDivision, setSelectedDivision] = useState<string>('all')
  const [assigningMatch, setAssigningMatch] = useState<Match | null>(null)
  const [selectedCourt, setSelectedCourt] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)

  const handleAssignCourt = async () => {
    if (!assigningMatch || !selectedCourt) return

    setIsAssigning(true)
    try {
      const result = await assignMatchToCourt(assigningMatch.id, assigningMatch.tournament_id, parseInt(selectedCourt))
      if (!result.success) {
        toast.error(result.error)
      } else {
        toast.success(`Match assigned to Court ${selectedCourt}`)
        setAssigningMatch(null)
        setSelectedCourt('')
      }
    } catch (error) {
      toast.error('Failed to assign match')
    } finally {
      setIsAssigning(false)
    }
  }

  // Get available courts (not currently occupied by in-progress matches)
  const getAvailableCourts = () => {
    const occupiedCourts = new Set(
      matches
        .filter(m => m.status === 'in_progress' && m.court_number !== null)
        .map(m => m.court_number)
    )
    
    return Array.from({ length: courts }, (_, i) => i + 1)
      .filter(courtNum => !occupiedCourts.has(courtNum))
  }

  // Group matches by division and category
  const divisionGroups = matches.reduce((acc, match: any) => {
    const key = `${match.division_id || 'no-division'}_${match.category_id || 'no-category'}`
    if (!acc[key]) {
      acc[key] = {
        matches: [],
        division: match.tournament_divisions,
        category: match.tournament_categories
      }
    }
    acc[key].matches.push(match)
    return acc
  }, {} as Record<string, { matches: Match[], division: any, category: any }>)

  const getPlayerDisplay = (playerId: string | null, match?: any) => {
    if (!playerId) {
      // Check if this is a match waiting for a previous round to complete
      if (match && match.round > 1) {
        return { name: 'Waiting for opponent', team: null }
      }
      return { name: 'BYE', team: null }
    }
    const p = participants.find(p => p.player_id === playerId)
    if (!p) return { name: 'TBD', team: null }
    
    return {
      name: `${p.player.first_name} ${p.player.last_name}`,
      team: p.team?.name || 'Unattached'
    }
  }

  const getDivisionLabel = (division: any, category: any) => {
    if (!division || !category) return 'General'
    
    // Normalize category name (FEATHER -> Feather)
    const categoryName = category.name.charAt(0).toUpperCase() + category.name.slice(1).toLowerCase()
    
    // Determine if it's a youth division (Cadet or Gradeschool)
    const isYouth = division.name.toLowerCase().includes('cadet') || division.name.toLowerCase().includes('gradeschool')
    
    // Determine gender label
    let genderLabel = ''
    if (category.gender === 'male') {
      genderLabel = isYouth ? 'Boys' : 'Men'
    } else if (category.gender === 'female') {
      genderLabel = isYouth ? 'Girls' : 'Women'
    }

    return `${division.name} ${genderLabel} - ${categoryName}`.trim()
  }

  // Get unique divisions for filter
  const divisions = useMemo(() => {
    const uniqueDivisions = new Map<string, string>()
    Object.entries(divisionGroups).forEach(([key, group]) => {
      const label = getDivisionLabel(group.division, group.category)
      uniqueDivisions.set(key, label)
    })
    return Array.from(uniqueDivisions.entries())
  }, [divisionGroups])

  // Filter matches based on search and division filter
  const filteredGroups = useMemo(() => {
    return Object.entries(divisionGroups).filter(([key, group]) => {
      // Division filter
      if (selectedDivision !== 'all' && key !== selectedDivision) {
        return false
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const hasMatchingPlayer = group.matches.some((match: any) => {
          const player1Name = getPlayerDisplay(match.player1_id).name.toLowerCase()
          const player2Name = getPlayerDisplay(match.player2_id).name.toLowerCase()
          return player1Name.includes(query) || player2Name.includes(query)
        })
        
        if (!hasMatchingPlayer) {
          return false
        }
      }

      return true
    })
  }, [divisionGroups, selectedDivision, searchQuery])

  const availableCourts = Array.from({ length: courts }, (_, i) => i + 1)

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by player name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Filter by division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    <span>All Divisions</span>
                  </div>
                </SelectItem>
                {divisions.map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Results count */}
          {(searchQuery || selectedDivision !== 'all') && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredGroups.length} of {Object.keys(divisionGroups).length} division{Object.keys(divisionGroups).length !== 1 ? 's' : ''}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Brackets */}
      {filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Trophy className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No matches found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter to find matches.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map(([key, group]) => {
            const divisionMatches = group.matches
            
            // Group by round within this division
            const rounds = divisionMatches.reduce((acc, match) => {
              if (!acc[match.round]) {
                acc[match.round] = []
              }
              acc[match.round].push(match)
              return acc
            }, {} as Record<number, Match[]>)

            const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b)
            const totalRounds = roundNumbers.length

            return (
              <Card key={key} className="overflow-hidden p-0 gap-0">
                <CardHeader className="bg-muted/50 border-b py-8">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    {getDivisionLabel(group.division, group.category)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex overflow-x-auto pb-4 -mx-2">
                    {roundNumbers.map((round) => (
                      <div key={round} className="flex flex-col justify-around min-w-[220px] mx-2 first:ml-0 last:mr-0">
                        <div className="text-center font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">
                          {getBracketRoundLabel(round, totalRounds)}
                        </div>
                        <div className="flex flex-col justify-around flex-grow space-y-4">
                        {rounds[round]
                          .sort((a, b) => a.match_number - b.match_number)
                          .map((match) => (
                            <Card 
                              key={match.id} 
                              className={cn(
                                "cursor-pointer hover:border-primary transition-colors relative",
                                match.status === 'completed' && "bg-muted/50",
                                match.status === 'in_progress' && "border-green-500 ring-1 ring-green-500",
                                (!match.player1_id || !match.player2_id) && "opacity-60 cursor-not-allowed"
                              )}
                              onClick={() => {
                                // Only allow click if both players are set
                                if (match.player1_id && match.player2_id) {
                                  onMatchClick?.(match)
                                }
                              }}
                            >
                              <CardContent className="p-3 text-sm">
                                <div className="flex flex-col gap-2">
                  <div className={cn(
                    "flex justify-between items-center p-2 rounded",
                    match.winner_id === match.player1_id ? "bg-primary/10 font-bold" : "bg-muted/50"
                  )}>
                    <div className="flex flex-col">
                      <span className="text-sm">{getPlayerDisplay(match.player1_id, match).name}</span>
                      <span className="text-[10px] text-muted-foreground">{getPlayerDisplay(match.player1_id, match).team}</span>
                    </div>
                    {match.status === 'completed' && (
                      <span className="text-sm font-bold">{match.score_player1}</span>
                    )}
                  </div>
                  <div className={cn(
                    "flex justify-between items-center p-2 rounded",
                    match.winner_id === match.player2_id ? "bg-primary/10 font-bold" : "bg-muted/50"
                  )}>
                    <div className="flex flex-col">
                      <span className="text-sm">{getPlayerDisplay(match.player2_id, match).name}</span>
                      <span className="text-[10px] text-muted-foreground">{getPlayerDisplay(match.player2_id, match).team}</span>
                    </div>
                    {match.status === 'completed' && (
                      <span className="text-sm font-bold">{match.score_player2}</span>
                    )}
                  </div>
                </div>                
                                {match.court_number && (
                                  <div className="mt-2 text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    Court {match.court_number}
                                  </div>
                                )}

                                {match.status === 'scheduled' && (
                                  <div className="absolute -right-2 -top-2 flex gap-1">
                                    {isOrganizer && courts > 0 && (
                                      <Button
                                        size="icon"
                                        variant="secondary"
                                        className="h-6 w-6 rounded-full shadow-sm bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setAssigningMatch(match)
                                        }}
                                        title="Assign to Court"
                                      >
                                        <MapPin className="h-3 w-3" />
                                      </Button>
                                    )}
                                    {isOrganizer && onEditMatch && (
                                      <Button
                                        size="icon"
                                        variant="secondary"
                                        className="h-6 w-6 rounded-full shadow-sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          onEditMatch(match)
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    )}
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground shadow-sm">
                                      {match.match_number}
                                    </span>
                                  </div>
                                )}
                                
                                {match.status === 'completed' && match.winner_id && (
                                  <div className="mt-2 text-xs text-center text-muted-foreground">
                                    Best of 3
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Court Assignment Dialog */}
      <Dialog open={!!assigningMatch} onOpenChange={(open) => !open && setAssigningMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Match to Court</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Court</Label>
              <Select value={selectedCourt} onValueChange={setSelectedCourt}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a court" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableCourts().length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No courts available
                    </div>
                  ) : (
                    getAvailableCourts().map((courtNum) => (
                      <SelectItem key={courtNum} value={courtNum.toString()}>
                        Court {courtNum}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {getAvailableCourts().length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  All courts are currently occupied. Please wait for a match to finish.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningMatch(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignCourt} 
              disabled={!selectedCourt || isAssigning || getAvailableCourts().length === 0}
            >
              {isAssigning ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
