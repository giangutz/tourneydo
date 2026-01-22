'use client'

import { useState, useMemo } from 'react'
import { Match, MatchWithReadiness } from '@/types/models'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select'
import { Trophy, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import BracketGenerator from './bracket/BracketGenerator'
import { transformMatchToGame } from '@/lib/utils/bracket-data-transformer'
import { Game } from '@/lib/types/bracket-models'
import { MatchResultDialog } from './match-result-dialog'
import { MatchParticipantsDialog } from './match-participants-dialog'
import { getBeltSkillCategory, getDivisionCategorySkillLabel } from '@/lib/utils'


interface BracketViewProps {
  matches: MatchWithReadiness[] | Match[]
  participants: any[]
  onMatchClick?: (match: Match) => void
  isOrganizer?: boolean
  onEditMatch?: (match: Match) => void
  courts?: number
  tournamentType?: 'standard' | 'open-belt'
  canScore?: boolean
  canManageParticipants?: boolean
}

export function BracketView({ 
  matches, 
  participants, 
  onMatchClick, 
  isOrganizer = false, 
  onEditMatch, 
  courts = 0, 
  tournamentType = 'standard',
  canScore = true,
  canManageParticipants = true
}: BracketViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDivision, setSelectedDivision] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5
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

  // Court assignment removed - use Court Manager page instead
  
  // DEBUG: Inspect match structure
  useMemo(() => {
    if (matches.length > 0) {
      console.log('BracketView matches[0]:', matches[0])
      console.log('Has tournament_divisions?', 'tournament_divisions' in matches[0])
    }
  }, [matches])

  // Group matches by division and category, THEN by connected component (bracket island)
  const divisionGroups = useMemo(() => {
    // Filter out AUTO_ADVANCE matches (BYE advancements) - they clutter the bracket
    const visibleMatches = matches.filter((match: any) => match.lifecycle_state !== 'AUTO_ADVANCE')
    
    // 1. Initial grouping by Division + Category
    const rawGroups: Record<string, Match[]> = {}
    
    visibleMatches.forEach((match: any) => {
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
            matches: islandMatches.sort((a, b) => {
              // Sort by formatted match number (M101, M205) if available
              if (a.match_number_formatted && b.match_number_formatted) {
                return a.match_number_formatted.localeCompare(b.match_number_formatted)
              }
              // Fallback to numeric match_number
              return a.match_number - b.match_number
            }),
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
      else genderLabel = 'Mixed'
      
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

      // Search filter - search by player name or match number
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const hasMatch = group.matches.some((match: any) => {
          // Search by player names
          const player1Name = getPlayerDisplay(match.player1_id).name.toLowerCase()
          const player2Name = getPlayerDisplay(match.player2_id).name.toLowerCase()
          const playerMatch = player1Name.includes(query) || player2Name.includes(query)
          
          // Search by match number
          const matchNumberStr = match.match_number?.toString() || ''
          const matchNumberFormatted = match.match_number_formatted?.toLowerCase() || ''
          const numberMatch = matchNumberStr.includes(query) || matchNumberFormatted.includes(query)
          
          return playerMatch || numberMatch
        })
        
        if (!hasMatch) {
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
      else genderLabel = 'Mixed'
      
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

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedDivision])

  // Pagination Logic
  const totalPages = Math.ceil(groupedBrackets.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedBrackets = groupedBrackets.slice(startIndex, endIndex)

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by player name or match number..."
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
          {paginatedBrackets.map((displayGroup) => (
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
                  
                  const divisionLabel = getDivisionCategorySkillLabel(group.division, group.category, skillLevel || undefined)
                  const games = groupGames[key] || []

                  return (
                    <Card key={key} className="overflow-hidden border-muted shadow-sm">
                      <CardHeader className="bg-muted/30 border-b py-3">
                        <CardTitle className="flex items-center gap-2 text-base font-medium">
                          {/* We could simplify this if under a header, but full label is safer */}
                          {divisionLabel}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 bg-white dark:bg-zinc-900 border-none max-w-full relative">
                        {/* Container with overflow-auto for horizontal scrolling ONLY within the card */}
                        <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
                          <div className="min-w-max p-6">
                            <BracketGenerator 
                              games={games}
                              onMatchClick={onMatchClick}
                              isOrganizer={isOrganizer}
                              onEditMatch={(isOrganizer && canScore) ? handleEditMatch : undefined}
                              onSwitchSides={(isOrganizer && canManageParticipants) ? (match) => handleSwitchSides(match, skillLevel) : undefined}
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, groupedBrackets.length)} of {groupedBrackets.length} divisions
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

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
