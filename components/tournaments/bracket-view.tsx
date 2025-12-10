'use client'

import { useState, useMemo } from 'react'
import { Match } from '@/types/models'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trophy, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { assignMatchToCourt } from '@/lib/actions/matches'
import { toast } from 'sonner'
import BracketGenerator from './bracket/BracketGenerator'
import { transformMatchToGame } from '@/lib/utils/bracket-data-transformer'
import { Game } from '@/lib/types/bracket-models'
import { MatchResultDialog } from './match-result-dialog'
import { MatchParticipantsDialog } from './match-participants-dialog'

interface BracketViewProps {
  matches: Match[]
  participants: any[]
  onMatchClick?: (match: Match) => void
  isOrganizer?: boolean
  onEditMatch?: (match: Match) => void
  courts?: number
  tournamentType?: 'standard' | 'open-belt'
}

/**
 * Map belt level to skill category for Standard tournaments
 */
function getBeltSkillCategory(beltLevel: string | null | undefined): string {
  if (!beltLevel) return ''
  
  const belt = beltLevel.toLowerCase()
  
  if (belt === 'white') return 'Beginner'
  if (belt === 'yellow' || belt === 'blue') return 'Novice I'
  if (belt === 'red' || belt === 'brown') return 'Novice II'
  if (belt === 'black') return 'Advanced'
  
  return '' // Unknown belt levels don't get a skill category label
}

export function BracketView({ matches, participants, onMatchClick, isOrganizer = false, onEditMatch, courts = 0, tournamentType = 'standard' }: BracketViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDivision, setSelectedDivision] = useState<string>('all')
  const [assigningMatch, setAssigningMatch] = useState<Match | null>(null)
  const [selectedCourt, setSelectedCourt] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [editingParticipantsMatch, setEditingParticipantsMatch] = useState<Match | null>(null)
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null)

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match)
  }

  const handleSwitchSides = (match: Match) => {
    setEditingParticipantsMatch(match)
  }

  const handleAssignCourt = async () => {
    if (!assigningMatch || !selectedCourt) return

    setIsAssigning(true)
    try {
      const courtNum = parseInt(selectedCourt)
      
      // Check if court is currently occupied (has an in_progress match)
      const isOccupied = matches.some(m => m.court_number === courtNum && m.status === 'in_progress')
      
      // Determine status: if occupied -> scheduled (queue), if free -> in_progress (live)
      const status = isOccupied ? 'scheduled' : 'in_progress'

      const result = await assignMatchToCourt(assigningMatch.id, assigningMatch.tournament_id, courtNum, status)
      
      if (!result.success) {
        toast.error(result.error)
      } else {
        const message = isOccupied 
          ? `Match added to Court ${selectedCourt} queue` 
          : `Match assigned to Court ${selectedCourt} (Live)`
        toast.success(message)
        setAssigningMatch(null)
        setSelectedCourt('')
      }
    } catch (error) {
      toast.error('Failed to assign match')
    } finally {
      setIsAssigning(false)
    }
  }

  // Get available courts (free OR queue < 3)
  const getAvailableCourts = () => {
    return Array.from({ length: courts }, (_, i) => i + 1)
      .map(courtNum => {
        const courtMatches = matches.filter(m => m.court_number === courtNum)
        const isOccupied = courtMatches.some(m => m.status === 'in_progress')
        const queueSize = courtMatches.filter(m => m.status === 'scheduled').length
        
        return {
          courtNum,
          isOccupied,
          queueSize,
          isAvailable: !isOccupied || queueSize < 3
        }
      })
      .filter(c => c.isAvailable)
  }

  // Group matches by division and category
  const divisionGroups = useMemo(() => {
    return matches.reduce((acc, match: any) => {
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
  }, [matches])

  const getPlayerDisplay = (playerId: string | null) => {
    if (!playerId) return { name: 'BYE', team: null }
    const p = participants.find(p => p.player_id === playerId)
    if (!p) return { name: 'TBD', team: null }
    return {
      name: `${p.player.first_name} ${p.player.last_name}`,
      team: p.team?.name || 'Unattached'
    }
  }

  const getDivisionLabel = (division: any, category: any, skillLevel?: string) => {
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

    // Add skill level for Standard tournaments
    const skillLevelLabel = (tournamentType === 'standard' && skillLevel) ? ` ${skillLevel}` : ''
    
    return `${division.name} ${genderLabel} ${skillLevelLabel} - ${categoryName}`.trim()
  }

  // Get unique divisions for filter
  const divisions = useMemo(() => {
    const uniqueDivisions = new Map<string, string>()
    Object.entries(divisionGroups).forEach(([key, group]) => {
      // For Standard tournaments, extract skill level from ANY participant in this group
      let skillLevel = ''
      if (tournamentType === 'standard') {
        // Get all player IDs from matches in this group
        const playerIds = new Set<string>()
        group.matches.forEach(m => {
          if (m.player1_id) playerIds.add(m.player1_id)
          if (m.player2_id) playerIds.add(m.player2_id)
        })
        
        // Find the first participant with a belt level
        for (const playerId of playerIds) {
          const participant = participants.find((p: any) => p.player_id === playerId)
          if (participant?.player?.belt_level) {
            skillLevel = getBeltSkillCategory(participant.player.belt_level)
            break
          }
        }
      }
      const label = getDivisionLabel(group.division, group.category, skillLevel)
      uniqueDivisions.set(key, label)
    })
    return Array.from(uniqueDivisions.entries())
  }, [divisionGroups, participants, tournamentType])

  // Filter groups based on search and division filter
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
  }, [divisionGroups, selectedDivision, searchQuery, participants])

  // Transform matches to games for each group
  const groupGames = useMemo(() => {
    const result: Record<string, Game[]> = {}
    
    filteredGroups.forEach(([key, group]) => {
      // Transform all matches in this group to games
      // We map over all matches, but BracketGenerator only needs the "Finals" (roots)
      // However, our transformMatchToGame builds the tree recursively if we pass all matches
      // But we need to pass the array of Game objects to BracketGenerator
      // BracketGenerator.makeFinals will filter out games that feed into others
      
      const games = group.matches.map(match => 
        transformMatchToGame(match, group.matches, participants)
      )
      result[key] = games
    })
    
    return result
  }, [filteredGroups, participants])

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
        <div className="space-y-8">
          {filteredGroups.map(([key, group]) => {
            // Extract skill level for this group (for Standard tournaments)
            let skillLevel = ''
            if (tournamentType === 'standard') {
              const playerIds = new Set<string>()
              group.matches.forEach(m => {
                if (m.player1_id) playerIds.add(m.player1_id)
                if (m.player2_id) playerIds.add(m.player2_id)
              })
              
              for (const playerId of playerIds) {
                const participant = participants.find((p: any) => p.player_id === playerId)
                if (participant?.player?.belt_level) {
                  skillLevel = getBeltSkillCategory(participant.player.belt_level)
                  break
                }
              }
            }
            
            const divisionLabel = getDivisionLabel(group.division, group.category, skillLevel)
            const games = groupGames[key] || []

            return (
              <Card key={key} className="overflow-hidden">
                <CardHeader className="bg-muted/50 border-b py-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {divisionLabel}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 bg-white dark:bg-zinc-900 overflow-x-auto">
                  <div className="min-w-full p-6">
                    <BracketGenerator 
                      games={games}
                      onMatchClick={(match) => {
                        // Handle court assignment if in assigning mode or if organizer clicks
                        if (isOrganizer) {
                          // Open assignment dialog
                          setAssigningMatch(match)
                        } else if (onMatchClick) {
                          onMatchClick(match)
                        }
                      }}
                      isOrganizer={isOrganizer}
                      onEditMatch={isOrganizer ? handleEditMatch : undefined}
                      onSwitchSides={isOrganizer ? handleSwitchSides : undefined}
                      hoveredTeamId={hoveredTeamId}
                      onHoveredTeamIdChange={setHoveredTeamId}
                    />
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
                    getAvailableCourts().map(({ courtNum, isOccupied, queueSize }) => (
                      <SelectItem key={courtNum} value={courtNum.toString()}>
                        Court {courtNum} 
                        {isOccupied ? ` (Queue: ${queueSize}/3)` : ' (Free)'}
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

      {/* Match Result Dialog for Editing */}
      <MatchResultDialog
        open={!!editingMatch}
        onOpenChange={(open) => !open && setEditingMatch(null)}
        match={editingMatch}
        participants={participants}
      />

      {/* Match Participants Dialog for Swapping */}
      <MatchParticipantsDialog
        open={!!editingParticipantsMatch}
        onOpenChange={(open) => !open && setEditingParticipantsMatch(null)}
        match={editingParticipantsMatch}
        participants={participants}
        divisions={divisions.map(([key, label]) => {
          const [divisionId, categoryId] = key.split('_')
          return {
            id: key,
            label,
            divisionId: divisionId === 'no-division' ? null : divisionId,
            categoryId: categoryId === 'no-category' ? null : categoryId
          }
        })}
      />
    </div>
  )
}
