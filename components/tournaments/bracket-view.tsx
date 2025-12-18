'use client'

import { useState, useMemo } from 'react'
import { Match } from '@/types/models'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select'
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
import { getBeltSkillCategory } from '@/lib/utils'
import { forEach } from 'underscore'


interface BracketViewProps {
  matches: Match[]
  participants: any[]
  onMatchClick?: (match: Match) => void
  isOrganizer?: boolean
  onEditMatch?: (match: Match) => void
  courts?: number
  tournamentType?: 'standard' | 'open-belt'
}

export function BracketView({ matches, participants, onMatchClick, isOrganizer = false, onEditMatch, courts = 0, tournamentType = 'standard' }: BracketViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDivision, setSelectedDivision] = useState<string>('all')
  const [assigningMatch, setAssigningMatch] = useState<Match | null>(null)
  const [selectedCourt, setSelectedCourt] = useState<string>('')
  const [isAssigning, setIsAssigning] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [editingParticipantsMatch, setEditingParticipantsMatch] = useState<Match | null>(null)
  const [editingSkillCategory, setEditingSkillCategory] = useState<string>('')
  const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null)

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match)
  }

  const handleSwitchSides = (match: Match, skillCategory?: string) => {
    setEditingParticipantsMatch(match)
    setEditingSkillCategory(skillCategory || '')
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

  // Group matches by division and category, THEN by connected component (bracket island)
  const divisionGroups = useMemo(() => {
    // 1. Initial grouping by Division + Category
    const rawGroups: Record<string, Match[]> = {}
    
    matches.forEach((match: any) => {
      const key = `${match.division_id || 'no-division'}_${match.category_id || 'no-category'}`
      if (!rawGroups[key]) rawGroups[key] = []
      rawGroups[key].push(match)
    })

    // 2. Refine groups: Split disjoint trees (islands) within the same Division+Category
    // This handles the case where "Standard" tournament puts Novice and Advanced in same Category but separate trees
    // without relying on missing player_ids in future rounds.
    
    const refinedGroups: Record<string, { matches: Match[], division: any, category: any, skillLabel?: string }> = {}

    Object.entries(rawGroups).forEach(([baseKey, groupMatches]) => {
      // Build adjacency graph for this group
      const adj = new Map<string, string[]>()
      const matchMap = new Map<string, Match>()
      
      groupMatches.forEach(m => {
        matchMap.set(m.id, m)
        if (!adj.has(m.id)) adj.set(m.id, [])
        
        // Link via next_match_id (Child -> Parent)
        if (m.next_match_id) {
          adj.get(m.id)!.push(m.next_match_id)
          if (!adj.has(m.next_match_id)) adj.set(m.next_match_id, [])
          adj.get(m.next_match_id)!.push(m.id) // Undirected for grouping
        }
      })

      // Find connected components (islands)
      const visited = new Set<string>()
      const strings: Match[][] = []

      groupMatches.forEach(startMatch => {
        if (visited.has(startMatch.id)) return
        
        const island: Match[] = []
        const queue = [startMatch.id]
        visited.add(startMatch.id)
        
        while (queue.length > 0) {
          const currId = queue.shift()!
          const currMatch = matchMap.get(currId)
          if (currMatch) island.push(currMatch)
          
          const neighbors = adj.get(currId) || []
          neighbors.forEach(nId => {
            if (!visited.has(nId)) {
              visited.add(nId)
              queue.push(nId)
            }
          })
        }
        strings.push(island)
      })

      // Create a final group for each island
      strings.forEach((islandMatches, idx) => {
        // Determine label for this island (e.g., "Novice I" vs "Advanced")
        // by looking at ANY player in this specific tree
        let skillLabel = ''
        if (tournamentType === 'standard') {
            // Find a player to representative skill
            for (const m of islandMatches) {
                const pid = m.player1_id || m.player2_id
                if (pid) {
                    const p = participants.find((part: any) => part.player_id === pid)
                    if (p?.player?.belt_level) {
                        skillLabel = getBeltSkillCategory(p.player.belt_level)
                        break
                    }
                }
            }
        }

        // Use a suffix for the key to ensure uniqueness if multiple islands exist
        const suffix = skillLabel ? `_${skillLabel}` : (strings.length > 1 ? `_Group${idx + 1}` : '')
        const finalKey = `${baseKey}${suffix}`

        refinedGroups[finalKey] = {
            matches: islandMatches.sort((a, b) => a.match_number - b.match_number),
            division: (islandMatches[0] as any).tournament_divisions,
            category: (islandMatches[0] as any).tournament_categories,
            skillLabel
        }
      })
    })

    return refinedGroups
  }, [matches, participants, tournamentType])

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

  // Helper to get sort priority for divisions
  const getDivisionPriority = (name: string) => {
    const n = name.toLowerCase()
    if (n.includes('gradeschool')) return 1
    if (n.includes('cadet')) return 2
    if (n.includes('junior')) return 3
    if (n.includes('senior')) return 4
    return 99
  }

  // Helper to get weight category priority
  const getCategoryPriority = (name: string) => {
    const n = name.toLowerCase()
    
    // Handle numbered groups (Group 0, Group 1...)
    if (n.startsWith('group')) {
      const match = n.match(/group\s*(\d+)/)
      if (match) {
        return parseInt(match[1])
      }
      return 99
    }

    // Standard weight classes
    const order = [
      'fin', 
      'fly', 
      'bantam', 
      'feather', 
      'light', 
      'welter', 
      'lt. middle', 
      'middle', 
      'lt. heavy', 
      'heavy'
    ]
    
    const idx = order.indexOf(n)
    return idx !== -1 ? idx + 100 : 999 
  }

  // Helper to get skill priority
  const getSkillPriority = (skill: string) => {
    const s = skill.toLowerCase()
    if (s.includes('beginner')) return 1
    if (s.includes('novice')) {
       if (s.includes('ii') || s.includes('2')) return 3
       return 2 
    }
    if (s.includes('advanced')) return 4
    return 99
  }

  // Get grouped divisions for filter
  const divisions = useMemo(() => {
    const groups: Record<string, { 
      label: string, 
      pDiv: number, 
      pSkill: number,
      genderLabel: string,
      options: { value: string, label: string, pCat: number }[] 
    }> = {}
    
    Object.entries(divisionGroups).forEach(([key, group]) => {
      // Reconstruct labels for grouping
      const divName = group.division?.name || 'General'
      const catName = group.category?.name 
        ? group.category.name.charAt(0).toUpperCase() + group.category.name.slice(1).toLowerCase() 
        : 'General'
      
      const isYouth = divName.toLowerCase().includes('cadet') || divName.toLowerCase().includes('gradeschool')
      let genderLabel = ''
      if (group.category?.gender === 'male') genderLabel = isYouth ? 'Boys' : 'Men'
      else if (group.category?.gender === 'female') genderLabel = isYouth ? 'Girls' : 'Women'
      
      const skillLabel = (tournamentType === 'standard' && group.skillLabel) ? group.skillLabel : ''
      
      // Group Label: "Gradeschool Boys Advanced"
      const parts = [divName, genderLabel, skillLabel].filter(Boolean)
      const groupLabel = parts.join(' ')
      
      if (!groups[groupLabel]) {
        groups[groupLabel] = {
           label: groupLabel,
           pDiv: getDivisionPriority(divName),
           pSkill: getSkillPriority(skillLabel),
           genderLabel: genderLabel,
           options: []
        }
      }
      
      groups[groupLabel].options.push({
        value: key,
        label: catName,
        pCat: getCategoryPriority(group.category?.name || '')
      })
    })

    // Sort Groups
    const sortedGroups = Object.values(groups).sort((a, b) => {
       // 1. Division
       if (a.pDiv !== b.pDiv) return a.pDiv - b.pDiv
       // 2. Gender (Boys/Men < Girls/Women)
       if (a.genderLabel !== b.genderLabel) return a.genderLabel.localeCompare(b.genderLabel)
       // 3. Skill (Beginner < Novice < Advanced)
       if (a.pSkill !== b.pSkill) return a.pSkill - b.pSkill
       
       return a.label.localeCompare(b.label)
    })

    // Sort Options within Groups
    sortedGroups.forEach(g => {
       g.options.sort((a, b) => a.pCat - b.pCat)
    })

    return sortedGroups
  }, [divisionGroups, tournamentType])

  // Filter groups based on search and division filter
  const filteredGroups = useMemo(() => {
    const result = Object.entries(divisionGroups).filter(([key, group]) => {
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

    // Sort the result groups using the same logic
    return result.sort((a, b) => {
        const groupA = a[1]
        const groupB = b[1]
        
        // 1. Division Priority
        const pDivA = getDivisionPriority(groupA.division?.name || '')
        const pDivB = getDivisionPriority(groupB.division?.name || '')
        if (pDivA !== pDivB) return pDivA - pDivB

        // 2. Group Context
        const getContextKey = (g: any) => {
            const divName = g.division?.name || ''
            // Simplify gender check for grouping
            const gender = g.category?.gender || ''
            const skill = g.skillLabel || ''
            return `${divName}-${gender}-${skill}`
        }
        
        const contextA = getContextKey(groupA)
        const contextB = getContextKey(groupB)
        if (contextA !== contextB) return contextA.localeCompare(contextB)
        
        // 3. Category Priority
        const pCatA = getCategoryPriority(groupA.category?.name || '')
        const pCatB = getCategoryPriority(groupB.category?.name || '')
        return pCatA - pCatB
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

  // Group filtered brackets for display
  const groupedBrackets = useMemo(() => {
    const groups: Record<string, { 
      label: string, 
      pDiv: number, 
      pSkill: number,
      genderLabel: string,
      items: { key: string, group: any }[] 
    }> = {}
    
    filteredGroups.forEach(([key, group]) => {
      const divName = group.division?.name || 'General'
      const isYouth = divName.toLowerCase().includes('cadet') || divName.toLowerCase().includes('gradeschool')
      let genderLabel = ''
      if (group.category?.gender === 'male') genderLabel = isYouth ? 'Boys' : 'Men'
      else if (group.category?.gender === 'female') genderLabel = isYouth ? 'Girls' : 'Women'
      
      const skillLabel = (tournamentType === 'standard' && group.skillLabel) ? group.skillLabel : ''
      const parts = [divName, genderLabel, skillLabel].filter(Boolean)
      const groupLabel = parts.join(' ')
      
      if (!groups[groupLabel]) {
        groups[groupLabel] = {
           label: groupLabel,
           pDiv: getDivisionPriority(divName),
           pSkill: getSkillPriority(skillLabel),
           genderLabel: genderLabel,
           items: []
        }
      }
      groups[groupLabel].items.push({ key, group })
    })

    // Sort Groups
    const sortedGroups = Object.values(groups).sort((a, b) => {
       // 1. Division
       if (a.pDiv !== b.pDiv) return a.pDiv - b.pDiv
       // 2. Gender
       if (a.genderLabel !== b.genderLabel) return a.genderLabel.localeCompare(b.genderLabel)
       // 3. Skill
       if (a.pSkill !== b.pSkill) return a.pSkill - b.pSkill
       
       return a.label.localeCompare(b.label)
    })

    // Sort items within groups
    sortedGroups.forEach(g => {
       g.items.sort((a, b) => {
          const pCatA = getCategoryPriority(a.group.category?.name || '')
          const pCatB = getCategoryPriority(b.group.category?.name || '')
          return pCatA - pCatB
       })
    })

    return sortedGroups
  }, [filteredGroups, tournamentType])

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
                {divisions.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
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
          {groupedBrackets.map((displayGroup) => (
            <div key={displayGroup.label} className="space-y-6 pt-4 first:pt-0">
               <div className="flex items-center gap-2">
                 <h3 className="font-bold text-xl text-primary">{displayGroup.label}</h3>
               </div>
               
               <div className="space-y-8 pl-1">
                {displayGroup.items.map(({ key, group }) => {
                  // Extract skill level for this group (for Standard tournaments)
                  let skillLevel = ''
                  if (tournamentType === 'standard') {
                    const playerIds = new Set<string>()
                    group.matches.forEach((m: any) => {
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
                    <Card key={key} className="overflow-hidden border-muted shadow-sm">
                      <CardHeader className="bg-muted/30 border-b py-3">
                        <CardTitle className="flex items-center gap-2 text-base font-medium">
                          {/* We could simplify this if under a header, but full label is safer */}
                          {divisionLabel}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 bg-white dark:bg-zinc-900 border-none max-w-full">
                        {/* Container with overflow-auto for horizontal scrolling ONLY within the card */}
                        <div className="w-full overflow-x-auto pb-2">
                          <div className="min-w-max p-6">
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
                              onSwitchSides={isOrganizer ? (match) => handleSwitchSides(match, skillLevel) : undefined}
                              hoveredTeamId={hoveredTeamId}
                              onHoveredTeamIdChange={setHoveredTeamId}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
               </div>
            </div>
          ))}
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
        tournamentType={tournamentType}
        skillCategory={editingSkillCategory}
        divisions={divisions.flatMap(group => 
          group.options.map(opt => {
            const [divisionId, categoryId] = opt.value.split('_')
            return {
              id: opt.value,
              label: `${group.label} - ${opt.label}`,
              divisionId: divisionId === 'no-division' ? null : divisionId,
              categoryId: categoryId === 'no-category' ? null : categoryId
            }
          })
        )}
      />
    </div>
  )
}
