'use client'

import { useState } from 'react'
import { Match } from '@/types/models'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, getBeltSkillCategory, getCategoryDisplayName } from '@/lib/utils'

interface DivisionBreakdownProps {
  matches: Match[]
  participants?: any[]
}

const SKILL_ORDER = ['Beginner', 'Novice I', 'Novice II', 'Advanced', 'Unknown']
const ITEMS_PER_PAGE = 5

export function DivisionBreakdown({ matches, participants = [] }: DivisionBreakdownProps) {
  const [skillFilter, setSkillFilter] = useState<string>('all')
  const [selectedDivision, setSelectedDivision] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)

  // Calculate Stats
  const divisionStats: Record<string, { 
    players: Set<string>, 
    matches: number,
    rows: Map<string, { category: string, skill: string, playerCount: Set<string>, matchCount: number, completedCount: number }>
  }> = {}

  // Pre-pass: Find representative belt for each Division+Category group
  const repBeltMap = new Map<string, string>()
  
  if (matches.length > 0) {
    matches.forEach((m: any) => {
      const divName = m.tournament_divisions?.name
      const catName = m.tournament_categories?.name
      if (!divName || !catName) return
      
      const key = `${divName}::${catName}`
      if (!repBeltMap.has(key)) {
         // Try to find belt from players
         let belt = m.player1?.belt_level || m.player2?.belt_level
         if (!belt && participants.length > 0) {
            const p1 = participants.find((p: any) => p.player_id === m.player1_id)
            const p2 = participants.find((p: any) => p.player_id === m.player2_id)
            belt = p1?.player?.belt_level || p2?.player?.belt_level
         }
         
         if (belt) repBeltMap.set(key, belt)
      }
    })
  }

  // Filter matches to only include relevant lifecycle states
  const relevantMatches = matches.filter((m: any) => {
    const state = m.lifecycle_state
    return state === 'WAITING' || state === 'CONTEST' || state === 'IN_PROGRESS' || state === 'COMPLETED'
  })

  if (relevantMatches.length > 0) {
    relevantMatches.forEach((match: any) => {
      const divName = match.tournament_divisions?.name
      const catName = match.tournament_categories?.name
      
      // Skip matches without division/category data
      if (!divName || !catName) return
      
      // Determine skill level from either player's belt
      // For single-player matches (BYE), we only have one player
      let skill = ''
      
      // Helper to get belt from participants array (fallback)
      const getBeltFromParticipants = (playerId: string | null): string | null => {
        if (!playerId || participants.length === 0) return null
        const participant = participants.find((p: any) => p.player_id === playerId)
        return participant?.player?.belt_level || null
      }
      
      // Try to get skill from player1
      if (match.player1_id) {
        let p1Belt = match.player1?.belt_level
        // Fallback to participants if belt not in match data
        if (!p1Belt) {
          p1Belt = getBeltFromParticipants(match.player1_id)
        }
        if (p1Belt) {
          skill = getBeltSkillCategory(p1Belt)
        }
      }
      
      // If still empty, try player2
      if (!skill && match.player2_id) {
        let p2Belt = match.player2?.belt_level
        // Fallback to participants if belt not in match data
        if (!p2Belt) {
          p2Belt = getBeltFromParticipants(match.player2_id)
        }
        if (p2Belt) {
          skill = getBeltSkillCategory(p2Belt)
        }
      }
      
      // If still empty, try Representative Belt for the entire group (Division + Category)
      if (!skill) {
         const key = `${divName}::${catName}`
         const repBelt = repBeltMap.get(key)
         if (repBelt) {
            skill = getBeltSkillCategory(repBelt)
         }
      }
      
      // If still empty, mark as Unknown for display
      if (!skill) {
        skill = 'Unknown'
      }
      
      // Include all matches - organizers need to see everything
      
      if (!divisionStats[divName]) {
        divisionStats[divName] = { players: new Set(), matches: 0, rows: new Map() }
      }
      
      if (match.player1_id) divisionStats[divName].players.add(match.player1_id)
      if (match.player2_id) divisionStats[divName].players.add(match.player2_id)
      divisionStats[divName].matches++
      
      // Normalize category name for display
      const normalizedCatName = getCategoryDisplayName(catName)
      
      const rowKey = `${normalizedCatName}-${skill}`
      if (!divisionStats[divName].rows.has(rowKey)) {
        divisionStats[divName].rows.set(rowKey, {
          category: normalizedCatName,
          skill: skill,
          playerCount: new Set(),
          matchCount: 0,
          completedCount: 0
        })
      }
      
      const row = divisionStats[divName].rows.get(rowKey)!
      if (match.player1_id) row.playerCount.add(match.player1_id)
      if (match.player2_id) row.playerCount.add(match.player2_id)
      row.matchCount++
      if (match.lifecycle_state === 'COMPLETED') row.completedCount++
    })
  }

  const sortedDivisionNames = Object.keys(divisionStats).sort()
  const activeDivision = selectedDivision || (sortedDivisionNames.length > 0 ? sortedDivisionNames[0] : '')

  if (matches.length === 0) return null

  return (
    <Card className="col-span-full mt-4">
      <CardHeader className="py-4 px-6 border-b">
        <CardTitle className="text-base">Breakdown per Division</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {sortedDivisionNames.length > 0 ? (
          <Tabs value={activeDivision} onValueChange={(val) => {
              setSelectedDivision(val)
              setCurrentPage(1)
          }} className="w-full">
            <div className="w-full overflow-x-auto pb-2 mb-4">
              <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 inline-flex min-w-full">
                {sortedDivisionNames.map(name => (
                  <TabsTrigger key={name} value={name} className="px-4 py-2 whitespace-nowrap">{name}</TabsTrigger>
                ))}
              </TabsList>
            </div>
            
            {sortedDivisionNames.map(divName => {
              const stats = divisionStats[divName]
              const rows = Array.from(stats.rows.values())
                .filter(r => skillFilter === 'all' || r.skill.toLowerCase() === skillFilter.toLowerCase())
                // Sort by Skill Order first, then Category
                .sort((a, b) => {
                    const skillDiff = SKILL_ORDER.indexOf(a.skill) - SKILL_ORDER.indexOf(b.skill)
                    if (skillDiff !== 0) return skillDiff
                    return a.category.localeCompare(b.category)
                })

              // Pagination Logic
              const totalPages = Math.ceil(rows.length / ITEMS_PER_PAGE)
              const paginatedRows = rows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                
              return (
                <TabsContent key={divName} value={divName} className="mt-0">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{stats.players.size}</span> Players • <span className="font-medium text-foreground">{stats.matches}</span> Matches
                    </div>
                    <Select value={skillFilter} onValueChange={(val) => {
                        setSkillFilter(val)
                        setCurrentPage(1)
                    }}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by Skill" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Skills</SelectItem>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Novice I">Novice I</SelectItem>
                        <SelectItem value="Novice II">Novice II</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Category</TableHead>
                        <TableHead>Skill Level</TableHead>
                        <TableHead className="text-right">Players</TableHead>
                        <TableHead className="w-[180px]">Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            No data matching filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedRows.map((row, idx) => {
                          const rowProgress = row.matchCount > 0 ? Math.round((row.completedCount / row.matchCount) * 100) : 0
                          const matchesLeft = row.matchCount - row.completedCount
                          
                          return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{row.category}</TableCell>
                            <TableCell>
                              <span className={cn(
                                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ring-1 ring-inset",
                                  row.skill === 'Advanced' ? 'bg-purple-50 text-purple-700 ring-purple-600/20' :
                                  row.skill === 'Beginner' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                  row.skill.startsWith('Novice') ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                                  'bg-gray-50 text-gray-600 ring-gray-500/10'
                              )}>
                                {row.skill}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{row.playerCount.size}</TableCell>
                            <TableCell>
                              <TooltipProvider>
                                  <Tooltip delayDuration={0}>
                                      <TooltipTrigger asChild>
                                          <div className="flex items-center gap-2 cursor-help">
                                              <Progress value={rowProgress} className="h-2 w-full" />
                                              <span className="text-xs text-muted-foreground w-8 text-right">{rowProgress}%</span>
                                          </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                          <p>{matchesLeft} matches left</p>
                                      </TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        )})
                      )}
                    </TableBody>
                  </Table>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                      <div className="flex items-center justify-end space-x-2 py-4">
                          <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                          >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                          </Button>
                          <div className="text-xs text-muted-foreground">
                              Page {currentPage} of {totalPages}
                          </div>
                          <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                          >
                              Next
                              <ChevronRight className="h-4 w-4" />
                          </Button>
                      </div>
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No divisions found</div>
        )}
      </CardContent>
    </Card>
  )
}
